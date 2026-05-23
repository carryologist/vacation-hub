import PhotosPageClient from './PhotosPageClient';
import { getConfig } from '@/lib/config';

export default async function PhotosPage() {
  const config = await getConfig();
  const tripName = config?.tripName ?? 'Our Trip';

  return <PhotosPageClient tripName={tripName} />;
}
