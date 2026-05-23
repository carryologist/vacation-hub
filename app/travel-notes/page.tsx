import TravelNotesClient from './TravelNotesClient';
import { getConfig } from '@/lib/config';

export default async function TravelNotesPage() {
  const config = await getConfig();
  const tripName = config?.tripName ?? 'Our Trip';
  const startDate = config?.startDate ?? '';
  const endDate = config?.endDate ?? '';

  // Date constraints: startDate - 2 days for arrival min, endDate + 2 days for departure max
  let arrivalMin = '';
  let arrivalMax = '';
  let departureMin = '';
  let departureMax = '';

  if (startDate && endDate) {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const pre = new Date(start);
    pre.setDate(pre.getDate() - 2);
    const post = new Date(end);
    post.setDate(post.getDate() + 2);

    arrivalMin = pre.toISOString().split('T')[0];
    arrivalMax = endDate;
    departureMin = startDate;
    departureMax = post.toISOString().split('T')[0];
  }

  return (
    <TravelNotesClient
      tripName={tripName}
      arrivalMin={arrivalMin}
      arrivalMax={arrivalMax}
      departureMin={departureMin}
      departureMax={departureMax}
    />
  );
}
