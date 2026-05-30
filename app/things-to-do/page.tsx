import ThingsToDoClient from "../../components/ThingsToDoClient";
import { getConfig } from "@/lib/config";

export const dynamic = 'force-dynamic';

export default async function ThingsToDoPage() {
  const config = await getConfig();
  const destination = config?.destination ?? "your destination";
  const tripName = config?.tripName ?? "Our Trip";

  // Generic categories — no hardcoded activities, DB only
  const emptyCategories = [
    { category: "Restaurants", icon: "🍽️", activities: [] },
    { category: "Attractions", icon: "🏛️", activities: [] },
    { category: "Entertainment", icon: "🎭", activities: [] },
    { category: "Day Trips", icon: "🚗", activities: [] },
    { category: "Outdoors", icon: "🌲", activities: [] },
    { category: "Shopping", icon: "🛍️", activities: [] },
  ];

  return (
    <ThingsToDoClient
      initialActivities={emptyCategories}
      initialUserSuggestions={[]}
      destination={destination}
    />
  );
}
