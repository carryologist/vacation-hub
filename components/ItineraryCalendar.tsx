"use client";

import { useState, useEffect } from 'react';

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

interface ItineraryCalendarProps {
  events: ItineraryEvent[];
  startDate: Date;
  endDate: Date;
  onTimeSlotClick: (date: string, time: string) => void;
  onEventClick: (event: ItineraryEvent) => void;
}

export default function ItineraryCalendar({
  events,
  startDate,
  endDate,
  onTimeSlotClick,
  onEventClick
}: ItineraryCalendarProps) {
  const [viewMode, setViewMode] = useState<'week' | 'day'>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(startDate);

  // Default to day view on mobile, week on desktop
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    setViewMode(mql.matches ? 'week' : 'day');
    const handler = (e: MediaQueryListEvent) => setViewMode(e.matches ? 'week' : 'day');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Generate array of dates for the trip
  const generateDates = () => {
    const dates = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  // Generate time slots (6 AM to 11 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 23; hour++) {
      const time12 = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
      const time24 = `${hour.toString().padStart(2, '0')}:00`;
      slots.push({ display: time12, value: time24, hour });
    }
    return slots;
  };

  // Get events that start in a specific time slot
  const getEventsStartingInSlot = (date: Date, timeSlot: string) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventDateStr = eventStart.toISOString().split('T')[0];
      
      if (eventDateStr !== dateStr) return false;
      
      const eventHour = eventStart.getHours();
      const slotHour = parseInt(timeSlot.split(':')[0]);
      
      return eventHour === slotHour;
    });
  };

  // Calculate event height based on duration (in pixels, 60px per hour)
  const calculateEventHeight = (event: ItineraryEvent) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.max(durationHours * 60, 30);
  };

  // Calculate event position within the hour
  const calculateEventPosition = (event: ItineraryEvent) => {
    const start = new Date(event.startTime);
    const minutes = start.getMinutes();
    return (minutes / 60) * 60;
  };

  // Format time for event display
  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format date for API
  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const dates = generateDates();
  const timeSlots = generateTimeSlots();
  const displayDates = viewMode === 'week' ? dates : [selectedDate];

  // Get all events for a given date, sorted by start time
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events
      .filter(event => {
        const eventDate = new Date(event.startTime).toISOString().split('T')[0];
        return eventDate === dateStr;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  // Navigate to prev/next day
  const goToPrevDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    if (prevDay >= startDate) setSelectedDate(prevDay);
  };
  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    if (nextDay <= endDate) setSelectedDate(nextDay);
  };

  // ─── Mobile List View (day mode on small screens) ───
  const renderMobileListView = () => {
    const dayEvents = getEventsForDate(selectedDate);

    return (
      <div>
        {/* Day pill selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 -mx-1 px-1 scrollbar-hide">
          {dates.map((date, i) => {
            const isActive = date.toDateString() === selectedDate.toDateString();
            const count = getEventsForDate(date).length;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-center transition-all min-w-[56px]"
                style={{
                  background: isActive ? 'var(--brand)' : 'var(--bg-elevated)',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  border: isActive ? 'none' : '1px solid var(--border-subtle)',
                }}
              >
                <span className="text-[10px] uppercase font-semibold tracking-wide">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-lg font-bold leading-tight">{date.getDate()}</span>
                {count > 0 && (
                  <span
                    className="text-[9px] font-medium mt-0.5 rounded-full px-1.5"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--brand-light)',
                      color: isActive ? 'white' : 'var(--brand)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Events list */}
        {dayEvents.length === 0 ? (
          <div
            className="text-center py-12 rounded-xl"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          >
            <p className="text-lg mb-1">No events</p>
            <p className="text-sm">Tap a time slot below to add one</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayEvents.map(event => (
              <button
                key={event.id}
                className="w-full text-left rounded-xl p-3.5 flex gap-3 items-start transition-all active:scale-[0.98]"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={() => onEventClick(event)}
              >
                {/* Color bar */}
                <div
                  className="w-1 self-stretch rounded-full flex-shrink-0"
                  style={{ backgroundColor: event.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15px] leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {event.title}
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {formatEventTime(event.startTime, event.endTime)}
                  </div>
                  {event.location && (
                    <div className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                      📍 {event.location}
                    </div>
                  )}
                </div>
                {/* Series color dot */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: event.color }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Quick-add button */}
        <button
          className="w-full mt-3 py-3 rounded-xl text-sm font-medium transition-all"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px dashed var(--border)',
            color: 'var(--text-muted)',
          }}
          onClick={() => onTimeSlotClick(formatDateForAPI(selectedDate), '12:00')}
        >
          + Add Event
        </button>
      </div>
    );
  };

  // ─── Desktop Grid View (week mode) ───
  const renderDesktopGridView = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Date Headers */}
        <div
          className="grid grid-cols-[80px_1fr] gap-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="p-3 font-display text-sm font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            Time
          </div>
          <div className="grid gap-0 grid-cols-5">
            {displayDates.map((date, index) => (
              <div
                key={index}
                className="p-3 text-center font-medium cursor-pointer transition-colors"
                style={{ borderLeft: '1px solid var(--border)' }}
                onClick={() => {
                  setSelectedDate(date);
                  setViewMode('day');
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(date)}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {events.filter(event => {
                    const eventDate = new Date(event.startTime).toDateString();
                    return eventDate === date.toDateString();
                  }).length} events
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Slots */}
        <div className="relative">
          {timeSlots.map((timeSlot, timeIndex) => (
            <div
              key={timeIndex}
              className="grid grid-cols-[80px_1fr] gap-0"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              {/* Time Label */}
              <div
                className="p-3 text-sm font-display font-medium"
                style={{
                  color: 'var(--text-muted)',
                  borderRight: '1px solid var(--border)'
                }}
              >
                {timeSlot.display}
              </div>
              
              {/* Date Columns */}
              <div className="grid gap-0 grid-cols-5">
                {displayDates.map((date, dateIndex) => {
                  const slotEvents = getEventsStartingInSlot(date, timeSlot.value);
                  
                  return (
                    <div
                      key={dateIndex}
                      className="relative h-16 transition-colors cursor-pointer group"
                      style={{ borderLeft: '1px solid var(--border-subtle)' }}
                      onClick={() => onTimeSlotClick(formatDateForAPI(date), timeSlot.value)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--brand-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Add Event Hint */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span
                          className="text-xs font-medium"
                          style={{ color: 'var(--brand)' }}
                        >
                          + Add Event
                        </span>
                      </div>
                      
                      {/* Events */}
                      {slotEvents.map((event, eventIndex) => {
                        const height = calculateEventHeight(event);
                        const position = calculateEventPosition(event);
                        
                        return (
                          <div
                            key={event.id}
                            className="absolute left-1 right-1 rounded px-2 py-1 text-xs font-medium cursor-pointer hover:shadow-md transition-all z-10"
                            style={{
                              backgroundColor: event.color,
                              color: 'white',
                              height: `${height}px`,
                              top: `${position}px`,
                              marginLeft: `${eventIndex * 4}px`
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event);
                            }}
                            title={`${event.title}${event.location ? ` - ${event.location}` : ''}`}
                          >
                            <div className="truncate font-semibold">{event.title}</div>
                            {event.location && (
                              <div className="truncate opacity-90 text-xs">{event.location}</div>
                            )}
                            <div className="text-xs opacity-75">
                              {new Date(event.startTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="card-travel p-4 md:p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl md:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {viewMode === 'week' ? 'Week View' : formatDate(selectedDate)}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Day nav arrows (day view only) */}
          {viewMode === 'day' && (
            <>
              <button
                onClick={goToPrevDay}
                disabled={selectedDate <= startDate}
                className="btn btn-sm btn-outline"
              >
                ←
              </button>
              <button
                onClick={goToNextDay}
                disabled={selectedDate >= endDate}
                className="btn btn-sm btn-outline"
              >
                →
              </button>
            </>
          )}
          {/* View toggle — hidden on small screens since we force day view */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setViewMode('week')}
              className={`btn btn-sm ${viewMode === 'week' ? 'btn-primary' : 'btn-outline'}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`btn btn-sm ${viewMode === 'day' ? 'btn-primary' : 'btn-outline'}`}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      {/* Render the appropriate view */}
      {viewMode === 'day' ? renderMobileListView() : renderDesktopGridView()}

      {/* Legend */}
      <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>📌 Tap to add an event</span>
            <span>✏️ Tap events to edit</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>Total Events:</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{events.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
