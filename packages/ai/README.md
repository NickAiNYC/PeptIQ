# PeptIQ AI Integration

AI-powered analysis and report generation using Claude and OpenAI.

## Features

- Sample result analysis and grading (A/B/C/D/F)
- Natural language report generation
- Trend detection across supplier batches
- Quality alert generation
- Recommendation engine

## Usage

```typescript
import { analyzeSample, generateReport } from '@peptiq/ai';

const analysis = await analyzeSample(sampleResults);
const report = await generateReport(analysis);
```
