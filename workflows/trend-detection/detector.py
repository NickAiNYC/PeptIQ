#!/usr/bin/env python3
"""
Automated trend detection for peptide quality data.
Runs daily via cron/GitHub Actions.
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any

import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
import anthropic
import requests


class TrendDetector:
    def __init__(self):
        self.database_url = os.environ['DATABASE_URL']
        self.engine = create_engine(self.database_url)
        self.claude = anthropic.Anthropic(
            api_key=os.environ['ANTHROPIC_API_KEY']
        )
        self.slack_webhook = os.environ.get('SLACK_WEBHOOK_URL')

    def fetch_recent_tests(self, days: int = 7) -> pd.DataFrame:
        """Fetch test results from the past N days"""
        query = text("""
        SELECT
            s.id,
            s."trackingId" as tracking_id,
            s."peptideType",
            s."supplierName",
            s.purity,
            s.endotoxin,
            s."residualTfa",
            s."createdAt",
            s."aiGrade",
            sup.verified
        FROM samples s
        LEFT JOIN "Supplier" sup ON s."supplierName" = sup.name
        WHERE s.status = 'COMPLETED'
        AND s."createdAt" >= NOW() - INTERVAL :days_interval
        ORDER BY s."createdAt" DESC
        """)

        with self.engine.connect() as conn:
            return pd.read_sql(query, conn, params={"days_interval": f"{days} days"})

    def detect_declining_suppliers(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify suppliers with statistically significant quality decline"""
        declining: List[Dict[str, Any]] = []

        for supplier in df['supplierName'].unique():
            supplier_df = df[df['supplierName'] == supplier].sort_values('createdAt')

            if len(supplier_df) >= 4:
                recent = supplier_df.head(3)['purity'].mean()
                previous = (
                    supplier_df.iloc[3:6]['purity'].mean()
                    if len(supplier_df) > 3
                    else recent
                )

                drop = previous - recent

                if drop > 2.0:
                    declining.append({
                        'supplier': supplier,
                        'peptide': supplier_df.iloc[0]['peptideType'],
                        'previous_avg': round(float(previous), 1),
                        'recent_avg': round(float(recent), 1),
                        'drop': round(float(drop), 1),
                        'sample_count': len(supplier_df),
                        'severity': 'CRITICAL' if drop > 5.0 else 'WARNING'
                    })

        return declining

    def detect_batch_variance(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify suppliers with high batch-to-batch variance"""
        variance_issues: List[Dict[str, Any]] = []

        for supplier in df['supplierName'].unique():
            supplier_df = df[df['supplierName'] == supplier]

            if len(supplier_df) >= 3:
                std_dev = supplier_df['purity'].std()
                range_purity = (
                    supplier_df['purity'].max() - supplier_df['purity'].min()
                )

                if range_purity > 5.0:
                    variance_issues.append({
                        'supplier': supplier,
                        'peptide': supplier_df.iloc[0]['peptideType'],
                        'mean': round(float(supplier_df['purity'].mean()), 1),
                        'std_dev': round(float(std_dev), 1),
                        'range': round(float(range_purity), 1),
                        'batches': len(supplier_df),
                        'severity': 'WARNING'
                    })

        return variance_issues

    def detect_safety_concerns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Flag samples with elevated endotoxin or residual TFA"""
        safety_issues: List[Dict[str, Any]] = []

        for _, row in df.iterrows():
            concerns: List[str] = []
            severity = 'INFO'

            if pd.notna(row.get('endotoxin')) and row['endotoxin'] > 1.0:
                concerns.append(f"High endotoxin: {row['endotoxin']} EU/mg")
                severity = 'CRITICAL' if row['endotoxin'] > 2.0 else 'WARNING'

            if pd.notna(row.get('residualTfa')) and row['residualTfa'] > 1.5:
                concerns.append(f"High residual TFA: {row['residualTfa']}%")
                severity = 'WARNING'

            if concerns:
                safety_issues.append({
                    'tracking_id': row['tracking_id'],
                    'supplier': row['supplierName'],
                    'peptide': row['peptideType'],
                    'concerns': concerns,
                    'severity': severity
                })

        return safety_issues

    def analyze_market_trends(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze overall market trends"""
        trends: Dict[str, Any] = {}

        for peptide in df['peptideType'].unique():
            peptide_df = df[df['peptideType'] == peptide]

            if len(peptide_df) >= 5:
                recent_avg = peptide_df.head(3)['purity'].mean()
                older_avg = peptide_df.tail(3)['purity'].mean()
                trends[peptide] = {
                    'avg_purity': round(float(peptide_df['purity'].mean()), 1),
                    'trend': 'improving' if recent_avg > older_avg else 'declining',
                    'sample_count': len(peptide_df)
                }

        return trends

    def generate_ai_insights(
        self,
        df: pd.DataFrame,
        declining: List[Dict[str, Any]],
        variance: List[Dict[str, Any]],
        safety: List[Dict[str, Any]]
    ) -> str:
        """Use Claude to generate natural language insights"""

        prompt = f"""
        You are a peptide quality analyst. Analyze this weekly quality data and provide actionable insights.

        Summary:
        - Total tests this week: {len(df)}
        - Unique suppliers: {df['supplierName'].nunique()}
        - Unique peptides: {df['peptideType'].nunique()}

        Declining Suppliers ({len(declining)}):
        {json.dumps(declining[:5], indent=2)}

        Batch Variance Issues ({len(variance)}):
        {json.dumps(variance[:5], indent=2)}

        Safety Concerns ({len(safety)}):
        {json.dumps(safety[:5], indent=2)}

        Market Trends:
        {json.dumps(self.analyze_market_trends(df), indent=2)}

        Provide:
        1. Three most urgent issues requiring immediate action
        2. One emerging trend to watch
        3. One specific recommendation for supplier outreach this week
        4. One positive development or opportunity

        Be concise. Focus on actionable intelligence.
        """

        message = self.claude.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )

        return message.content[0].text

    def send_alerts(
        self,
        declining: List[Dict[str, Any]],
        variance: List[Dict[str, Any]],
        safety: List[Dict[str, Any]],
        insights: str,
        total_tests: int
    ):
        """Send alerts to Slack"""
        if not self.slack_webhook:
            return

        # Critical issues (immediate action)
        critical = (
            [d for d in declining if d['severity'] == 'CRITICAL']
            + [s for s in safety if s['severity'] == 'CRITICAL']
        )

        if critical:
            blocks = [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🚨 CRITICAL QUALITY ALERTS",
                        "emoji": True
                    }
                }
            ]

            for issue in critical[:3]:
                concern_text = issue.get(
                    'concerns',
                    [f"Quality drop: {issue.get('drop', 0)}%"]
                )
                if isinstance(concern_text, list):
                    concern_text = concern_text[0]
                blocks.append({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            f"*{issue.get('supplier', 'Unknown')}*\n"
                            f"{concern_text}"
                        )
                    }
                })

            requests.post(self.slack_webhook, json={"blocks": blocks}, timeout=10)

        # Weekly summary
        requests.post(self.slack_webhook, json={
            "text": (
                f"📊 Weekly Quality Report: {total_tests} tests, "
                f"{len(declining)} declining, {len(safety)} safety issues"
            ),
            "attachments": [{
                "color": "#36a64f",
                "text": insights[:500] + "..."
            }]
        }, timeout=10)

    def run(self):
        """Main execution"""
        print(f"[{datetime.now()}] Running trend detection...")

        df = self.fetch_recent_tests(days=7)

        if len(df) == 0:
            print("No recent tests found")
            return

        declining = self.detect_declining_suppliers(df)
        variance = self.detect_batch_variance(df)
        safety = self.detect_safety_concerns(df)
        insights = self.generate_ai_insights(df, declining, variance, safety)

        self.send_alerts(declining, variance, safety, insights, len(df))

        print(
            f"Complete. Found: {len(declining)} declining, "
            f"{len(variance)} variance, {len(safety)} safety"
        )
        print(f"Insights: {insights[:200]}...")


if __name__ == "__main__":
    detector = TrendDetector()
    detector.run()
