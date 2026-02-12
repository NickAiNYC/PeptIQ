interface PublicDatabaseProps {
  limit?: number;
}

interface PublicSample {
  trackingId: string;
  peptideType: string;
  supplierName: string;
  purity: number;
  endotoxin: number;
  aiGrade: string;
  dateTested: string;
}

const GRADE_COLORS: Record<string, string> = {
  'A': 'bg-green-100 text-green-800',
  'B': 'bg-blue-100 text-blue-800',
  'C': 'bg-yellow-100 text-yellow-800',
  'D': 'bg-orange-100 text-orange-800',
  'F': 'bg-red-100 text-red-800'
};

// Placeholder data for initial rendering
const PLACEHOLDER_DATA: PublicSample[] = [
  { trackingId: 'PTQ-2026-0001', peptideType: 'BPC-157', supplierName: 'Supplier Alpha', purity: 98.2, endotoxin: 0.12, aiGrade: 'A', dateTested: '2026-01-15' },
  { trackingId: 'PTQ-2026-0002', peptideType: 'TB-500', supplierName: 'Supplier Beta', purity: 96.5, endotoxin: 0.08, aiGrade: 'A', dateTested: '2026-01-16' },
  { trackingId: 'PTQ-2026-0003', peptideType: 'Semaglutide', supplierName: 'Supplier Gamma', purity: 91.3, endotoxin: 0.45, aiGrade: 'C', dateTested: '2026-01-17' },
  { trackingId: 'PTQ-2026-0004', peptideType: 'BPC-157', supplierName: 'Supplier Delta', purity: 94.8, endotoxin: 0.22, aiGrade: 'B', dateTested: '2026-01-18' },
  { trackingId: 'PTQ-2026-0005', peptideType: 'GHK-Cu', supplierName: 'Supplier Alpha', purity: 97.1, endotoxin: 0.05, aiGrade: 'A', dateTested: '2026-01-19' }
];

export function PublicDatabase({ limit = 10 }: PublicDatabaseProps) {
  const samples = PLACEHOLDER_DATA.slice(0, limit);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Tracking ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Peptide
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Supplier
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Purity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Endotoxin
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Grade
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Date Tested
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {samples.map((sample) => (
            <tr key={sample.trackingId} className="hover:bg-slate-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                {sample.trackingId}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                {sample.peptideType}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                {sample.supplierName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                {sample.purity.toFixed(1)}%
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                {sample.endotoxin.toFixed(2)} EU/mg
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${GRADE_COLORS[sample.aiGrade] || 'bg-slate-100 text-slate-800'}`}>
                  {sample.aiGrade}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                {sample.dateTested}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
