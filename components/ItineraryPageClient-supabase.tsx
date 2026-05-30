"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import ItineraryCalendar from './ItineraryCalendar';
import EventModal from './EventModal';
import ItineraryPdfUpload from './ItineraryPdfUpload';
import CalendarExport from './CalendarExport';

// Component interface (camelCase) - matches EventModal interface
interface ItineraryEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  url?: string;
  category: string;
  color: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface PrefilledEventData {
  title?: string;
  description?: string;
  location?: string;
  url?: string;
  category?: string;
}

interface ItineraryPageClientProps {
  startDate: string;
  endDate: string;
  timezone: string;
  tripName: string;
}

export default function ItineraryPageClientSupabase({
  startDate,
  endDate,
  timezone,
  tripName,
}: ItineraryPageClientProps) {
  const [events, setEvents] = useState<ItineraryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ItineraryEvent | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: string; time: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefilledData, setPrefilledData] = useState<PrefilledEventData | null>(null);
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  
  const searchParams = useSearchParams();

  // Trip dates derived from props
  const tripStartDate = useMemo(() => {
    return new Date(startDate + 'T00:00:00');
  }, [startDate]);

  const tripEndDate = useMemo(() => {
    return new Date(endDate + 'T23:59:59');
  }, [endDate]);

  // Check for URL parameters to pre-fill event creation
  useEffect(() => {
    const shouldCreate = searchParams.get('create');
    if (shouldCreate === 'true') {
      const prefilled = {
        title: searchParams.get('title') || '',
        description: searchParams.get('description') || '',
        location: searchParams.get('location') || '',
        url: searchParams.get('url') || '',
        category: searchParams.get('category') || 'activity'
      };
      
      setPrefilledData(prefilled);
      setShowEventModal(true);
      
      // Clear URL parameters after extracting data
      window.history.replaceState({}, '', '/itinerary');
    }
  }, [searchParams]);

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/itinerary/');
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      // Convert snake_case DB rows to camelCase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedEvents: ItineraryEvent[] = data.map((event: Record<string, any>) => ({
        id: event.id?.toString() || '',
        title: event.title,
        description: event.description || '',
        startTime: event.start_time,
        endTime: event.end_time,
        location: event.location || '',
        url: event.url || '',
        category: event.category,
        color: event.color,
        createdBy: event.created_by || '',
        createdAt: event.created_at || '',
        updatedAt: event.updated_at || ''
      }));
      setEvents(formattedEvents);
      setError(null);
    } catch {
      console.error('Error fetching events:');
      setError('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Create new event
  const createEvent = async (eventData: Omit<ItineraryEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const res = await fetch('/api/itinerary/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventData.title,
          description: eventData.description || null,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          location: eventData.location || null,
          url: eventData.url || null,
          category: eventData.category,
          color: eventData.color,
          created_by: eventData.createdBy || null
        })
      });
      if (!res.ok) throw new Error('Failed to create event');

      await fetchEvents();
      setShowEventModal(false);
      setSelectedEvent(null);
      setSelectedTimeSlot(null);
      setPrefilledData(null);
    } catch {
      console.error('Error creating event:');
      setError('Failed to create event');
    }
  };

  // Update existing event
  const updateEvent = async (eventData: ItineraryEvent) => {
    try {
      const res = await fetch('/api/itinerary/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(eventData.id),
          title: eventData.title,
          description: eventData.description || null,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          location: eventData.location || null,
          url: eventData.url || null,
          category: eventData.category,
          color: eventData.color,
          created_by: eventData.createdBy || null
        })
      });
      if (!res.ok) throw new Error('Failed to update event');

      await fetchEvents();
      setShowEventModal(false);
      setSelectedEvent(null);
      setSelectedTimeSlot(null);
    } catch {
      console.error('Error updating event:');
      setError('Failed to update event');
    }
  };

  // Delete event
  const deleteEvent = async (eventId: string) => {
    try {
      const res = await fetch('/api/itinerary/', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(eventId) })
      });
      if (!res.ok) throw new Error('Failed to delete event');

      await fetchEvents();
      setShowEventModal(false);
      setSelectedEvent(null);
      setSelectedTimeSlot(null);
    } catch {
      console.error('Error deleting event:');
      setError('Failed to delete event');
    }
  };

  const handleTimeSlotClick = (date: string, time: string) => {
    setSelectedTimeSlot({ date, time });
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event: ItineraryEvent) => {
    setSelectedEvent(event);
    setSelectedTimeSlot(null);
    setShowEventModal(true);
  };

  const handleCloseModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
    setSelectedTimeSlot(null);
    setPrefilledData(null);
  };

  // Wrapper function to handle both create and update cases
  const handleSaveEvent = async (eventData: ItineraryEvent | Omit<ItineraryEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (selectedEvent) {
      // Update existing event
      await updateEvent(eventData as ItineraryEvent);
    } else {
      // Create new event
      await createEvent(eventData as Omit<ItineraryEvent, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div
          className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4"
          style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}
        ></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading your itinerary...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          className="p-4 rounded-lg"
          style={{
            background: 'color-mix(in srgb, var(--accent-red) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-red) 40%, transparent)',
            color: 'var(--accent-red)',
          }}
        >
          <p className="font-medium">⚠️ {error}</p>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-center gap-3 flex-wrap">
        <button
          onClick={() => {
            setSelectedTimeSlot({ date: startDate, time: '12:00' });
            setSelectedEvent(null);
            setPrefilledData(null);
            setShowEventModal(true);
          }}
          className="btn btn-primary"
        >
          Add an Activity
        </button>
        <button
          onClick={() => setShowPdfUpload((v) => !v)}
          className="btn btn-primary"
        >
          📄 Upload Itinerary
        </button>
        <CalendarExport tripName={tripName} />
      </div>

      {showPdfUpload && (
        <ItineraryPdfUpload
          tripStartDate={startDate}
          tripEndDate={endDate}
          onEventsAdded={() => {
            fetchEvents();
            setShowPdfUpload(false);
          }}
        />
      )}
      
      <ItineraryCalendar
        events={events}
        onTimeSlotClick={handleTimeSlotClick}
        onEventClick={handleEventClick}
        startDate={tripStartDate}
        endDate={tripEndDate}
      />
      
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          timeSlot={selectedTimeSlot}
          prefilledData={prefilledData}
          onSave={handleSaveEvent}
          onDelete={selectedEvent ? () => deleteEvent(selectedEvent.id) : undefined}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
