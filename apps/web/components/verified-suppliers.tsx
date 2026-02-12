interface VerifiedSupplier {
  name: string;
  tier: string;
  avgPurity: number;
  sampleCount: number;
  peptides: string[];
  verified: boolean;
}

// Placeholder data for initial rendering
const PLACEHOLDER_SUPPLIERS: VerifiedSupplier[] = [
  {
    name: 'Supplier Alpha',
    tier: 'PREMIUM',
    avgPurity: 97.8,
    sampleCount: 24,
    peptides: ['BPC-157', 'TB-500', 'GHK-Cu'],
    verified: true
  },
  {
    name: 'Supplier Beta',
    tier: 'BASIC',
    avgPurity: 96.2,
    sampleCount: 12,
    peptides: ['TB-500', 'Semaglutide'],
    verified: true
  },
  {
    name: 'Supplier Epsilon',
    tier: 'PREMIUM',
    avgPurity: 98.1,
    sampleCount: 31,
    peptides: ['BPC-157', 'Semaglutide', 'Tirzepatide', 'NAD+'],
    verified: true
  }
];

export function VerifiedSuppliers() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {PLACEHOLDER_SUPPLIERS.map((supplier) => (
        <div
          key={supplier.name}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              {supplier.name}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              supplier.tier === 'PREMIUM'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {supplier.tier === 'PREMIUM' ? '★ Premium' : 'Basic'}
            </span>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Avg Purity</span>
              <span className="font-medium text-green-600">{supplier.avgPurity.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Samples Tested</span>
              <span className="font-medium text-slate-900">{supplier.sampleCount}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {supplier.peptides.map((peptide) => (
              <span
                key={peptide}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600"
              >
                {peptide}
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center text-sm text-green-600">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified
          </div>
        </div>
      ))}
    </div>
  );
}
