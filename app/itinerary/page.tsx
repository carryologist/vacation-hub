import { Suspense } from 'react';
import ItineraryPageClientSupabase from '../../components/ItineraryPageClient-supabase';
import { getConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function ItineraryPage() {
  const config = await getConfig();
  const tripName = config?.tripName ?? 'Our Trip';
  const startDate = config?.startDate ?? new Date().toISOString().split('T')[0];
  const endDate = config?.endDate ?? new Date().toISOString().split('T')[0];

  return (
    <div className="container space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="badge badge-primary mb-4">📅 Interactive Schedule</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
          {tripName} <span className="text-gradient">Itinerary</span>
        </h1>
        <p className="text-lg opacity-75 max-w-2xl mx-auto">
          Plan our trip together! Click on any time slot to add an event, or click existing events to edit them. Events sync across all devices!
        </p>
      </div>

      {/* Client Component with Suspense */}
      <Suspense fallback={
        <div className="card p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}></div>
          <p className="opacity-75">Loading itinerary...</p>
        </div>
      }>
        <ItineraryPageClientSupabase
          startDate={startDate}
          endDate={endDate}
          timezone="America/New_York"
          tripName={tripName}
        />
      </Suspense>
    </div>
  );
}
