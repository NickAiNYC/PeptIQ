import { SampleSubmissionForm } from '@/components/sample-submission-form';
import { PublicDatabase } from '@/components/public-database';
import { VerifiedSuppliers } from '@/components/verified-suppliers';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <section className="px-4 py-20 mx-auto max-w-7xl">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Know exactly what&apos;s in your vial.
          </h1>
          <p className="mt-6 text-xl leading-8 text-slate-600 max-w-3xl mx-auto">
            Independent, third-party testing for research peptides.
            Transparent results. Verified suppliers. No marketing, just data.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <a
              href="/submit-sample"
              className="rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Test a sample
            </a>
            <a
              href="/database"
              className="text-lg font-semibold leading-6 text-slate-900"
            >
              Browse public database <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      {/* Trust Metrics */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <dl className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <dt className="text-4xl font-bold text-blue-600">500+</dt>
              <dd className="mt-2 text-lg text-slate-600">Samples tested</dd>
            </div>
            <div className="text-center">
              <dt className="text-4xl font-bold text-blue-600">150+</dt>
              <dd className="mt-2 text-lg text-slate-600">Suppliers monitored</dd>
            </div>
            <div className="text-center">
              <dt className="text-4xl font-bold text-blue-600">99.2%</dt>
              <dd className="mt-2 text-lg text-slate-600">Report accuracy</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Public Database Preview */}
      <section className="py-20 max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">
          Latest test results
        </h2>
        <PublicDatabase limit={5} />
      </section>

      {/* Verified Suppliers */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Verified suppliers
          </h2>
          <p className="text-xl text-slate-600 mb-12 max-w-3xl">
            These suppliers maintain &gt;95% purity across quarterly testing.
          </p>
          <VerifiedSuppliers />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">
          Join the quality revolution
        </h2>
        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          Whether you&apos;re a researcher, clinic, or supplier&mdash;transparency benefits everyone.
        </p>
        <a
          href="/peptide-passport"
          className="inline-flex items-center rounded-md border border-transparent bg-blue-100 px-8 py-4 text-lg font-medium text-blue-700 hover:bg-blue-200"
        >
          Learn about Peptide Passport &rarr;
        </a>
      </section>
    </div>
  );
}
