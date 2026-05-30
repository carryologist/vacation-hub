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

interface PrefilledEventData {
  title?: string;
  description?: string;
  location?: string;
  url?: string;
  category?: string;
}

interface EventModalProps {
  event?: ItineraryEvent | null;
  timeSlot?: { date: string; time: string } | null;
  prefilledData?: PrefilledEventData | null;
  onSave: (eventData: Omit<ItineraryEvent, 'id' | 'createdAt' | 'updatedAt'> | ItineraryEvent) => void;
  onDelete?: (eventId: string) => void;
  onClose: () => void;
}

const EVENT_CATEGORIES = [
  { value: 'general', label: 'General', color: '#0ea5e9' },
  { value: 'meal', label: 'Meal', color: '#f59e0b' },
  { value: 'activity', label: 'Activity', color: '#10b981' },
  { value: 'travel', label: 'Travel', color: '#8b5cf6' },
  { value: 'celebration', label: 'Celebration', color: '#ef4444' },
  { value: 'rest', label: 'Rest/Free Time', color: '#6b7280' }
];

export default function EventModal({
  event,
  timeSlot,
  prefilledData,
  onSave,
  onDelete,
  onClose
}: EventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    url: '',
    category: 'general',
    color: '#0ea5e9'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (event) {
      // Editing existing event
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);
      
      setFormData({
        title: event.title,
        description: event.description || '',
        startTime: formatDateTimeForInput(startTime),
        endTime: formatDateTimeForInput(endTime),
        location: event.location || '',
        url: event.url || '',
        category: event.category,
        color: event.color
      });
    } else if (timeSlot) {
      // Creating new event from time slot
      const startDateTime = new Date(`${timeSlot.date}T${timeSlot.time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour duration
      
      setFormData({
        title: prefilledData?.title || '',
        description: prefilledData?.description || '',
        startTime: formatDateTimeForInput(startDateTime),
        endTime: formatDateTimeForInput(endDateTime),
        location: prefilledData?.location || '',
        url: prefilledData?.url || '',
        category: prefilledData?.category || 'general',
        color: EVENT_CATEGORIES.find(cat => cat.value === (prefilledData?.category || 'general'))?.color || '#0ea5e9'
      });
    } else if (prefilledData) {
      // Creating new event with prefilled data (from activities)
      const now = new Date();
      const startDateTime = new Date(now.getTime() + 60 * 60 * 1000); // Default to 1 hour from now
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour duration
      
      setFormData({
        title: prefilledData.title || '',
        description: prefilledData.description || '',
        startTime: formatDateTimeForInput(startDateTime),
        endTime: formatDateTimeForInput(endDateTime),
        location: prefilledData.location || '',
        url: prefilledData.url || '',
        category: prefilledData.category || 'activity',
        color: EVENT_CATEGORIES.find(cat => cat.value === (prefilledData.category || 'activity'))?.color || '#10b981'
      });
    }
  }, [event, timeSlot, prefilledData]);

  // Format date for datetime-local input
  const formatDateTimeForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Update color when category changes
    if (field === 'category') {
      const category = EVENT_CATEGORIES.find(cat => cat.value === value);
      if (category) {
        setFormData(prev => ({ ...prev, color: category.color }));
      }
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }
    
    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      
      if (start >= end) {
        newErrors.endTime = 'End time must be after start time';
      }
    }
    
    if (formData.url && !isValidUrl(formData.url)) {
      newErrors.url = 'Please enter a valid URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Normalize a bare domain or www. prefix into a full URL
  const normalizeUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
    if (trimmed.includes('.') && !trimmed.includes(' ')) return `https://${trimmed}`;
    return trimmed;
  };

  // Validate URL (after normalization)
  const isValidUrl = (url: string) => {
    try {
      new URL(normalizeUrl(url));
      return true;
    } catch {
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const eventData = {
      ...formData,
      url: formData.url ? normalizeUrl(formData.url) : '',
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
      ...(event && { id: event.id })
    };
    
    onSave(eventData);
  };

  // Handle delete
  const handleDelete = () => {
    if (event && onDelete) {
      onDelete(event.id);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border)',
    color: 'var(--text-primary)',
  };

  const inputFocusClass = 'focus:ring-2 focus:border-transparent';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" style={{ overscrollBehavior: 'contain' }}>
      <div
        className="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {event ? 'Edit Event' : 'Create New Event'}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close modal"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 pb-8 space-y-6">
          {/* Title */}
          <div>
            <label
              className="block text-sm font-medium mb-2 font-display"
              style={{ color: 'var(--text-primary)' }}
            >
              Event Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${inputFocusClass} transition-colors`}
              style={{
                ...inputStyle,
                borderColor: errors.title ? 'var(--accent-red)' : 'var(--border)',
                boxShadow: 'none',
              }}
              onFocus={(e) => {
                if (!errors.title) {
                  e.currentTarget.style.borderColor = 'var(--brand)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = errors.title ? 'var(--accent-red)' : 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="e.g., Group Dinner"
            />
            {errors.title && (
              <p className="text-sm mt-1" style={{ color: 'var(--accent-red)' }}>{errors.title}</p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-2 font-display"
                style={{ color: 'var(--text-primary)' }}
              >
                Start Date &amp; Time *
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                className={`w-full px-3 py-3 border rounded-lg ${inputFocusClass} transition-colors`}
                style={{
                  ...inputStyle,
                  borderColor: errors.startTime ? 'var(--accent-red)' : 'var(--border)',
                  boxShadow: 'none',
                }}
                onFocus={(e) => {
                  if (!errors.startTime) {
                    e.currentTarget.style.borderColor = 'var(--brand)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.startTime ? 'var(--accent-red)' : 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {errors.startTime && (
                <p className="text-sm mt-1" style={{ color: 'var(--accent-red)' }}>{errors.startTime}</p>
              )}
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-2 font-display"
                style={{ color: 'var(--text-primary)' }}
              >
                End Date &amp; Time *
              </label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                className={`w-full px-3 py-3 border rounded-lg ${inputFocusClass} transition-colors`}
                style={{
                  ...inputStyle,
                  borderColor: errors.endTime ? 'var(--accent-red)' : 'var(--border)',
                  boxShadow: 'none',
                }}
                onFocus={(e) => {
                  if (!errors.endTime) {
                    e.currentTarget.style.borderColor = 'var(--brand)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.endTime ? 'var(--accent-red)' : 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {errors.endTime && (
                <p className="text-sm mt-1" style={{ color: 'var(--accent-red)' }}>{errors.endTime}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              className="block text-sm font-medium mb-2 font-display"
              style={{ color: 'var(--text-primary)' }}
            >
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg ${inputFocusClass} transition-colors resize-none`}
              style={{ ...inputStyle, boxShadow: 'none' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="Add details about the event..."
            />
          </div>

          {/* Location */}
          <div>
            <label
              className="block text-sm font-medium mb-2 font-display"
              style={{ color: 'var(--text-primary)' }}
            >
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${inputFocusClass} transition-colors`}
              style={{ ...inputStyle, boxShadow: 'none' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="e.g., Restaurant Name, Address"
            />
          </div>

          {/* URL */}
          <div>
            <label
              className="block text-sm font-medium mb-2 font-display"
              style={{ color: 'var(--text-primary)' }}
            >
              URL/Link
            </label>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${inputFocusClass} transition-colors`}
              style={{ ...inputStyle, boxShadow: 'none' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="example.com or https://example.com"
            />
          </div>

          {/* Category */}
          <div>
            <label
              className="block text-sm font-medium mb-2 font-display"
              style={{ color: 'var(--text-primary)' }}
            >
              Category
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {EVENT_CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => {
                    handleInputChange('category', category.value);
                    handleInputChange('color', category.color);
                  }}
                  className="p-3 rounded-lg text-sm font-medium transition-all"
                  style={{
                    border: `2px solid ${
                      formData.category === category.value
                        ? 'var(--brand)'
                        : 'var(--border)'
                    }`,
                    background:
                      formData.category === category.value
                        ? 'var(--brand-light)'
                        : 'var(--bg-elevated)',
                    color:
                      formData.category === category.value
                        ? 'var(--brand)'
                        : 'var(--text-secondary)',
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add to Calendar (existing events only) */}
          {event && (
            <div
              className="pt-4"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <button
                type="button"
                onClick={() => window.open(`/api/itinerary/export?id=${event.id}`, '_blank')}
                className="btn btn-sm btn-outline flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Add to My Calendar
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div
            className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-between gap-3 pt-4"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div>
              {event && onDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    background: 'var(--accent-red)',
                    color: 'white',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  Delete Event
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                {event ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div
            className="rounded-xl shadow-xl max-w-md w-full p-6"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <h3
              className="font-display text-xl font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Delete Event?
            </h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to delete &quot;{event?.title}&quot;? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: 'var(--accent-red)',
                  color: 'white',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
