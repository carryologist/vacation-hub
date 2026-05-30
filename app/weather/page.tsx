import WeatherClient from '@/components/WeatherClient';
import { getConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function WeatherPage() {
  const config = await getConfig();
  const tripName = config?.tripName ?? 'Our Trip';
  const destination = config?.destination ?? '';
  const startDate = config?.startDate ?? '';
  const endDate = config?.endDate ?? '';

  return (
    <WeatherClient
      tripName={tripName}
      destination={destination}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
