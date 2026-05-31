import { Suspense } from 'react';
import { getConfig } from '@/lib/config';
import ExpensesClient from '@/components/ExpensesClient';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const config = await getConfig();
  const tripName = config?.tripName ?? 'Our Trip';

  return (
    <div className="container space-y-8 animate-fade-in">
      <div className="text-center">
        <div className="badge badge-primary mb-4">💰 Group Expenses</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
          {tripName} <span className="text-gradient">Expenses</span>
        </h1>
        <p className="text-lg opacity-75 max-w-2xl mx-auto">
          Track shared expenses and see who owes whom. Upload receipts and we&apos;ll extract the details automatically.
        </p>
      </div>

      <Suspense fallback={
        <div className="card p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}></div>
          <p className="opacity-75">Loading expenses...</p>
        </div>
      }>
        <ExpensesClient tripName={tripName} />
      </Suspense>
    </div>
  );
}
