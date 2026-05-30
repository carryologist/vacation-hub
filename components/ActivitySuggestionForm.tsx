'use client'

import React from 'react'
import { useState } from 'react'


// Searchable Dropdown Component
function SearchableDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select or type to search...",
  name 
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredOptions = options.filter(option => 
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleSelect = (option: string) => {
    onChange(option);
    setSearchTerm('');
    setIsOpen(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setSearchTerm(inputValue);
    onChange(inputValue); // Allow custom values
    setIsOpen(true);
  };
  
  return (
    <div className="relative">
      <input
        type="text"
        name={name}
        value={value || searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Delay to allow clicks
        placeholder={placeholder}
        className="input input-bordered w-full"
        autoComplete="off"
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-60 overflow-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {filteredOptions.map((option, index) => (
            <div
              key={index}
              onClick={() => handleSelect(option)}
              className="px-4 py-2 cursor-pointer transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// URL formatting helper function
function formatUrl(input: string): string {
  if (!input || input.trim() === '') {
    return '';
  }
  
  const url = input.trim();
  
  // If it already has a protocol, return as-is
  if (url.match(/^https?:\/\//i)) {
    return url;
  }
  
  // If it starts with www., add https://
  if (url.match(/^www\./i)) {
    return `https://${url}`;
  }
  
  // If it looks like a domain (contains a dot and no spaces), add https://www.
  if (url.includes('.') && !url.includes(' ') && !url.includes('/')) {
    // Check if it already starts with a subdomain or if it's just domain.com
    if (url.split('.').length === 2 && !url.includes('://')) {
      return `https://www.${url}`;
    } else {
      return `https://${url}`;
    }
  }
  
  // If it contains a slash (path), add https:// but not www.
  if (url.includes('/')) {
    return `https://${url}`;
  }
  
  // Otherwise, return as-is
  return url;
}

interface ActivitySuggestionFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function ActivitySuggestionForm({ onClose, onSuccess }: ActivitySuggestionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [categoryValue, setCategoryValue] = useState('')
  
  const categoryOptions = [
    'Restaurants',
    'Attractions',
    'Entertainment',
    'Day Trips',
    'Outdoors',
    'Shopping',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()
      
      setIsSubmitting(true)
      setSubmitStatus('idle')
      setSubmitMessage('')
      
      let wasSuccessful = false;
      
      try {
        let formData;
        try {
          formData = new FormData(e.currentTarget);
        } catch (formError) {
          console.error('Error creating FormData:');
          throw formError;
        }
        
        // Format the website URL if provided
        try {
          const websiteValue = formData.get('website');
          if (websiteValue && typeof websiteValue === 'string') {
            const formattedUrl = formatUrl(websiteValue);
            formData.set('website', formattedUrl);
          }
        } catch (urlError) {
          console.error('Error formatting website URL:');
          throw urlError;
        }
        
        // Validate required fields client-side
        const requiredFields = ['name', 'activity_name', 'description', 'category'];
        let hasErrors = false;
        
        for (const field of requiredFields) {
          const value = formData.get(field);
          if (!value || String(value).trim().length === 0) {
            hasErrors = true;
            break;
          }
        }
        
        if (hasErrors) {
          setSubmitStatus('error');
          setSubmitMessage('Please fill in all required fields.');
          setIsSubmitting(false);
          return;
        }
        
        // Create activity suggestion object
        let activitySuggestion;
        try {
          activitySuggestion = {
            id: Date.now().toString(),
            name: String(formData.get('name')),
            activity_name: String(formData.get('activity_name')),
            description: String(formData.get('description')),
            location: String(formData.get('location') || ''),
            website: String(formData.get('website') || ''),
            category: String(formData.get('category')),
            notes: String(formData.get('notes') || ''),
            created_at: new Date().toISOString()
          };
        } catch (objectError) {
          console.error('Error creating activity suggestion object:');
          throw objectError;
        }
        
        // Save to database via API
        try {
          const res = await fetch('/api/activities/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: activitySuggestion.activity_name,
              description: activitySuggestion.description,
              category: activitySuggestion.category,
              location: activitySuggestion.location || null,
              url: activitySuggestion.website || null,
              suggested_by: activitySuggestion.name
            })
          });
          
          if (!res.ok) {
            throw new Error('Failed to save activity');
          }
          
          await res.json();
          
          setSubmitStatus('success');
          setSubmitMessage('Thanks for your activity suggestion! It has been saved and will sync across all devices.');
          wasSuccessful = true;
          
          // Refresh data to show new entry immediately
          if (onSuccess) {
            onSuccess();
          }
          
          // Auto-close form after successful submission
          setTimeout(() => {
            if (onClose) {
              onClose();
            }
          }, 3000);
          
        } catch {
          console.error('Failed to save to database, falling back to localStorage:');
          
          // Fallback to localStorage
          const existingSuggestions = localStorage.getItem('vh-activity-suggestions');
          const suggestions = existingSuggestions ? JSON.parse(existingSuggestions) : [];
          suggestions.push(activitySuggestion);
          localStorage.setItem('vh-activity-suggestions', JSON.stringify(suggestions));
          
          setSubmitStatus('success');
          setSubmitMessage('Thanks for your activity suggestion! It has been saved locally.');
          wasSuccessful = true;
          
          if (onSuccess) {
            onSuccess();
          }
          
          setTimeout(() => {
            if (onClose) {
              onClose();
            }
          }, 3000);
        }
        
        // Reset form safely
        if (e.currentTarget && typeof e.currentTarget.reset === 'function') {
          e.currentTarget.reset();
          setCategoryValue(''); // Reset category dropdown
        }
        
      } catch {
        console.error('Error submitting activity suggestion:');
        setSubmitStatus('error');
        setSubmitMessage('Something went wrong. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      
    } catch {
      console.error('Error in form submission handler:');
    }
  }

  return (
    <div className="card">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4" style={{ background: 'var(--brand-light)' }}>
          💡
        </div>
        <h3 className="font-display text-xl font-semibold mb-2">
          Suggest an Activity
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Know a great restaurant, attraction, or experience? Share it with the group!
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Your Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="input w-full"
              placeholder="Who's making this suggestion?"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-2">
              Category *
            </label>
            <SearchableDropdown
              name="category"
              options={categoryOptions}
              value={categoryValue}
              onChange={setCategoryValue}
              placeholder="Type to search categories..."
            />
            {/* Hidden input for form submission */}
            <input type="hidden" name="category" value={categoryValue} />
          </div>
        </div>
        
        <div>
          <label htmlFor="activity_name" className="block text-sm font-medium mb-2">
            Activity Name *
          </label>
          <input
            type="text"
            id="activity_name"
            name="activity_name"
            required
            className="input w-full"
            placeholder="What's the name of this place or activity?"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            className="input w-full resize-none"
            placeholder="Tell us about this activity — what makes it special?"
          />
        </div>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="location" className="block text-sm font-medium mb-2">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              className="input w-full"
              placeholder="City or specific address"
            />
          </div>
          <div>
            <label htmlFor="website" className="block text-sm font-medium mb-2">
              Website
            </label>
            <input
              type="text"
              id="website"
              name="website"
              className="input w-full"
              placeholder="example.com or https://example.com"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-2">
            Additional Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            className="input w-full resize-none"
            placeholder="Any special tips, best times to visit, or other helpful info?"
          />
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            'Share Activity Suggestion'
          )}
        </button>
      </form>
      
      {/* Status Messages */}
      {submitStatus === 'success' && (
        <div className="mt-4 p-4 rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent-green) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-green) 30%, transparent)', color: 'var(--accent-green)' }}>
          <div className="flex items-center">
            <span className="text-lg mr-2">✅</span>
            <span>{submitMessage}</span>
          </div>
        </div>
      )}
      
      {submitStatus === 'error' && (
        <div className="mt-4 p-4 rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent-red) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-red) 30%, transparent)', color: 'var(--accent-red)' }}>
          <div className="flex items-center">
            <span className="text-lg mr-2">❌</span>
            <span>{submitMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}
