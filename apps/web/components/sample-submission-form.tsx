'use client';

import { useState } from 'react';

const PEPTIDE_TYPES = [
  { value: 'BPC157', label: 'BPC-157' },
  { value: 'TB500', label: 'TB-500' },
  { value: 'SEMAGLUTIDE', label: 'Semaglutide' },
  { value: 'TIRZEPATIDE', label: 'Tirzepatide' },
  { value: 'GHKCU', label: 'GHK-Cu' },
  { value: 'NAD', label: 'NAD+' },
  { value: 'MOTSC', label: 'MOTS-c' },
  { value: 'EPITALON', label: 'Epitalon' },
  { value: 'SEMAX', label: 'Semax' },
  { value: 'SELANK', label: 'Selank' },
  { value: 'CJC1295', label: 'CJC-1295' },
  { value: 'IPAMORELIN', label: 'Ipamorelin' },
  { value: 'OTHER', label: 'Other' }
];

const TEST_TIERS = [
  { value: 'TIER1', label: 'Tier 1 - Identity + Purity + TFA', price: '$89' },
  { value: 'TIER2', label: 'Tier 2 - + Endotoxin + Sterility', price: '$149' },
  { value: 'TIER3', label: 'Tier 3 - Full Validation + Impurity Profile', price: '$249' }
];

export function SampleSubmissionForm() {
  const [formData, setFormData] = useState({
    peptideType: '',
    supplierName: '',
    batchNumber: '',
    purchaseDate: '',
    testTier: 'TIER1'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingId, setTrackingId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setTrackingId(data.trackingId);
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-8 text-center">
        <div className="text-green-500 text-5xl mb-4">✓</div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Sample Submitted</h3>
        <p className="text-slate-600 mb-4">Your tracking ID:</p>
        <p className="text-2xl font-mono font-bold text-blue-600 mb-6">{trackingId}</p>
        <p className="text-sm text-slate-500">
          You&apos;ll receive shipping instructions via email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white rounded-xl shadow-md p-8">
      <h3 className="text-2xl font-bold text-slate-900 mb-6">Submit a Sample</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Peptide Type
          </label>
          <select
            value={formData.peptideType}
            onChange={(e) => setFormData({ ...formData, peptideType: e.target.value })}
            className="w-full rounded-md border border-slate-300 p-2"
            required
          >
            <option value="">Select peptide...</option>
            {PEPTIDE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Supplier Name
          </label>
          <input
            type="text"
            value={formData.supplierName}
            onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
            className="w-full rounded-md border border-slate-300 p-2"
            placeholder="e.g., Supplier XYZ"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Batch Number (optional)
          </label>
          <input
            type="text"
            value={formData.batchNumber}
            onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
            className="w-full rounded-md border border-slate-300 p-2"
            placeholder="e.g., LOT-2026-001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Purchase Date (optional)
          </label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            className="w-full rounded-md border border-slate-300 p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Test Tier
          </label>
          <div className="space-y-2">
            {TEST_TIERS.map((tier) => (
              <label
                key={tier.value}
                className={`flex items-center justify-between p-3 rounded-md border cursor-pointer ${
                  formData.testTier === tier.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="testTier"
                    value={tier.value}
                    checked={formData.testTier === tier.value}
                    onChange={(e) => setFormData({ ...formData, testTier: e.target.value })}
                    className="mr-3"
                  />
                  <span className="text-sm text-slate-700">{tier.label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{tier.price}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Sample'}
        </button>
      </div>
    </form>
  );
}
