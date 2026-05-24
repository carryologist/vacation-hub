'use client'

import { useState, useEffect } from 'react'
import ActivitySuggestionForm from "./ActivitySuggestionForm";
import { ActivitySuggestion as DbActivitySuggestion } from '../lib/db';

interface ActivitySuggestion {
  id: string;
  name: string;
  activity_name: string;
  description: string;
  location: string;
  website: string;
  category: string;
  notes: string;
  image_url?: string;
  created_at: string;
}

interface Activity {
  id?: string;
  name: string;
  description: string;
  location: string;
  website?: string;
  image?: string;
  highlights?: string[];
  isUserSubmitted?: boolean;
  submittedBy?: string;
  notes?: string;
  category?: string;
}

interface CategoryGroup {
  category: string;
  icon: string;
  activities: Activity[];
}

// Client component for activity cards
function ActivityCard({ 
  activity, 
  categoryIcon, 
  categoryIndex, 
  activityIndex,
  categoryName,
  onDelete,
  onEdit
}: { 
  activity: Activity
  categoryIcon: string
  categoryIndex: number
  activityIndex: number
  categoryName?: string
  onDelete?: (activityId: string) => void
  onEdit?: (activity: Activity) => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [fetchedImage, setFetchedImage] = useState<string | null>(null)

  // Fetch a photo from the og-image API when the activity has no image
  useEffect(() => {
    if (activity.image || !activity.name) return
    let cancelled = false
    const params = new URLSearchParams()
    if (activity.website) {
      params.set('url', activity.website)
    }
    const queryParts = [activity.name, categoryName, activity.category].filter(Boolean).join(' ')
    params.set('query', queryParts)
    fetch(`/api/og-image?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.imageUrl) {
          setFetchedImage(data.imageUrl)
        }
      })
      .catch(() => { /* keep emoji fallback */ })
    return () => { cancelled = true }
  }, [activity.image, activity.name, activity.website, categoryName, activity.category])

  const displayImage = activity.image || fetchedImage

  const handleDelete = async () => {
    if (!activity.id || !onDelete) return
    
    if (confirm(`Are you sure you want to delete "${activity.name}"? This action cannot be undone.`)) {
      setIsDeleting(true)
      try {
        await onDelete(activity.id)
      } catch (error) {
        console.error('Delete failed:')
        alert('Failed to delete activity. Please try again.')
      } finally {
        setIsDeleting(false)
      }
    }
  }

  return (
    <div 
      className={`card hover:scale-[1.02] transition-transform duration-300 ${
        activity.isUserSubmitted 
          ? 'border-2' 
          : ''
      }`}
      style={activity.isUserSubmitted ? { borderColor: 'var(--brand)', background: 'var(--brand-light)' } : undefined}
    >
      <div className="grid lg:grid-cols-[300px_1fr] gap-4 lg:gap-6">
        {/* Activity Image */}
        <div className="relative aspect-[16/9] lg:aspect-[3/2] rounded-lg overflow-hidden">
          {displayImage ? (
            <img 
              src={displayImage} 
              alt={activity.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to gradient if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div 
            className={`w-full h-full flex items-center justify-center ${
              displayImage ? 'hidden' : ''
            }`}
            style={{ background: 'var(--brand-light)' }}
          >
            <span className="text-4xl">{categoryIcon}</span>
          </div>
        </div>
        
        {/* Activity Content */}
        <div className="flex flex-col px-2 sm:px-0">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-display text-xl font-semibold">
                {activity.name}
              </h3>
            </div>
            
            <p className="mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {activity.description}
            </p>
            
            {activity.highlights && activity.highlights.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {activity.highlights.map((highlight, index) => (
                  <span 
                    key={index}
                    className="badge badge-primary text-xs"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            )}
            
            {activity.notes && (
              <div className="rounded-lg p-3 mb-4 mx-0" style={{ background: 'var(--brand-light)', border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)' }}>
                <p className="text-sm break-words" style={{ color: 'var(--text-primary)' }}>
                  <strong>💡 Tip:</strong> {activity.notes}
                </p>
              </div>
            )}
          </div>
          
          {/* Activity Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 gap-3 sm:gap-0" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {activity.location && (
                <span className="flex items-center gap-1">
                  📍 {activity.location}
                </span>
              )}
              {activity.isUserSubmitted && activity.submittedBy && (
                <span className="flex items-center gap-1">
                  👤 Suggested by {activity.submittedBy}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {activity.website && (
                <a
                  href={activity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary text-sm"
                >
                  Visit Website
                </a>
              )}
              
              {/* Edit/Delete Buttons */}
              <div className="flex items-center gap-1">
                {onEdit && (
                  <button
                    onClick={() => onEdit(activity)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--accent-blue)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    title="Edit activity"
                  >
                    ✏️
                  </button>
                )}
                {onDelete && activity.id && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-2 rounded-lg transition-colors disabled:opacity-50"
                    style={{ color: 'var(--accent-red)' }}
                    onMouseEnter={(e) => { if (!isDeleting) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    title="Delete activity"
                  >
                    {isDeleting ? '⏳' : '🗑️'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ThingsToDoClient({ 
  initialActivities,
  initialUserSuggestions,
  destination,
  tripName,
}: {
  initialActivities: CategoryGroup[]
  initialUserSuggestions: ActivitySuggestion[]
  destination?: string
  tripName?: string
}) {
  const [activities, setActivities] = useState<CategoryGroup[]>(initialActivities)
  const [showSuggestionForm, setShowSuggestionForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [freshSuggestions, setFreshSuggestions] = useState<ActivitySuggestion[]>(initialUserSuggestions)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('vh-deleted-activities');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  })

  // Fetch fresh suggestions from database
  const fetchFreshSuggestions = async () => {
    try {
      const res = await fetch('/api/activities');
      if (!res.ok) throw new Error('Failed to fetch activities');
      const data: DbActivitySuggestion[] = await res.json();
      
      // Convert DB format to ActivitySuggestion format
      const mapped = data.map(suggestion => ({
        id: suggestion.id?.toString() || Date.now().toString(),
        name: suggestion.suggested_by || 'Anonymous',
        activity_name: suggestion.title,
        description: suggestion.description,
        location: suggestion.location || '',
        website: suggestion.url || '',
        category: suggestion.category,
        notes: suggestion.notes || '',
        image_url: suggestion.image_url || '',
        created_at: suggestion.created_at || new Date().toISOString()
      }));

      // Fuzzy deduplicate: if title A contains title B (or vice versa),
      // or they share enough significant words, keep only the first one.
      const freshUserSuggestions: typeof mapped = [];
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const significantWords = (s: string) =>
        normalize(s).split(/\s+/).filter(w => w.length > 2 && !['the','and','for','tour','show','visit','trip','experience','at','of','in','to','a','hot','chicken','bar','grill','restaurant','house','place','center','museum','park','cafe','club','hall'].includes(w));

      for (const item of mapped) {
        const norm = normalize(item.activity_name);
        const words = significantWords(item.activity_name);
        const isDupe = freshUserSuggestions.some(existing => {
          const existingNorm = normalize(existing.activity_name);
          // Substring match: "Grand Ole Opry" is inside "Grand Ole Opry Show"
          if (existingNorm.includes(norm) || norm.includes(existingNorm)) return true;
          // Shared-word match: must share majority of the shorter title's words
          const existingWords = significantWords(existing.activity_name);
          const shared = words.filter(w => existingWords.includes(w)).length;
          const shorter = Math.min(words.length, existingWords.length);
          if (shorter >= 2 && shared >= Math.ceil(shorter * 0.6)) return true;
          return false;
        });
        if (!isDupe) freshUserSuggestions.push(item);
      }
      
      setFreshSuggestions(freshUserSuggestions);
    } catch (err) {
      console.error('Failed to fetch fresh activity suggestions:');
    }
  };

  // Refresh fresh suggestions from Supabase
  const refreshData = async () => {
    await fetchFreshSuggestions();
  };

  // Load user suggestions from localStorage and merge with fresh Supabase data
  useEffect(() => {
    // Fetch fresh data from Supabase first
    fetchFreshSuggestions();
  }, []);

  // Update activities when fresh suggestions change
  useEffect(() => {
    // If we have fresh suggestions from Supabase, ignore initial suggestions to prevent duplicates
    let allUserSuggestions: ActivitySuggestion[] = [];
    
    if (freshSuggestions.length > 0) {
      // Use only fresh suggestions from database, ignore initial suggestions
      allUserSuggestions = [...freshSuggestions];
    } else {
      // Fallback to initial suggestions and localStorage if no fresh data
      
      // Clean up localStorage - remove any suggestions that already exist in initialUserSuggestions
      const storedSuggestions = localStorage.getItem('vh-activity-suggestions');
      if (storedSuggestions && initialUserSuggestions.length > 0) {
        const localSuggestions: ActivitySuggestion[] = JSON.parse(storedSuggestions);
        
        // Filter out any local suggestions that match initial suggestions by name
        const filteredLocalSuggestions = localSuggestions.filter(localSugg => 
          !initialUserSuggestions.some(dbSugg => {
            const nameMatch = dbSugg.activity_name.toLowerCase().trim() === localSugg.activity_name.toLowerCase().trim();
            return nameMatch;
          })
        );
        
        // Update localStorage with cleaned data
        if (filteredLocalSuggestions.length !== localSuggestions.length) {
          localStorage.setItem('vh-activity-suggestions', JSON.stringify(filteredLocalSuggestions));
        }
        
        allUserSuggestions = [...initialUserSuggestions, ...filteredLocalSuggestions];
      } else {
        const cleanedStoredSuggestions = localStorage.getItem('vh-activity-suggestions');
        const userSuggestions: ActivitySuggestion[] = cleanedStoredSuggestions ? JSON.parse(cleanedStoredSuggestions) : [];
        allUserSuggestions = [...initialUserSuggestions, ...userSuggestions];
      }
    }
    
    if (allUserSuggestions.length > 0) {
      // Filter out deleted curated activities
      const updatedActivities = initialActivities.map(group => ({
        ...group,
        activities: group.activities.filter(a => !a.id || !deletedIds.has(a.id))
      }));
      
      // Add user suggestions to existing categories
      allUserSuggestions.forEach(suggestion => {
        const categoryIndex = updatedActivities.findIndex(group => group.category === suggestion.category);
        
        const userActivity: Activity = {
          id: suggestion.id,
          name: suggestion.activity_name,
          description: suggestion.description,
          location: suggestion.location,
          website: suggestion.website || undefined,
          image: suggestion.image_url || undefined,
          isUserSubmitted: true,
          submittedBy: suggestion.name,
          notes: suggestion.notes || undefined,
          category: suggestion.category
        };
        
        if (categoryIndex >= 0) {
          // Check if this activity already exists in the category to prevent duplicates
          const existingActivity = updatedActivities[categoryIndex].activities.find(
            activity => activity.id === userActivity.id || 
            (activity.name.toLowerCase().trim() === userActivity.name.toLowerCase().trim() &&
             activity.description.toLowerCase().trim() === userActivity.description.toLowerCase().trim())
          );
          
          if (!existingActivity) {
            // Add to existing category only if it doesn't already exist
            updatedActivities[categoryIndex].activities.push(userActivity);
          }
        } else {
          // Create new category
          const getCategoryIcon = (category: string) => {
            const iconMap: { [key: string]: string } = {
              "Restaurants": "🍽️",
              "Attractions": "🏛️",
              "Entertainment": "🎭",
              "Day Trips": "🚗",
              "Outdoors": "🌿",
              "Shopping": "🛍️",
            };
            return iconMap[category] || "📌";
          };
          
          updatedActivities.push({
            category: suggestion.category,
            icon: getCategoryIcon(suggestion.category),
            activities: [userActivity]
          });
        }
      });
      
      setActivities(updatedActivities);
    } else {
      // If no user suggestions, just filter deleted curated activities
      setActivities(initialActivities.map(group => ({
        ...group,
        activities: group.activities.filter(a => !a.id || !deletedIds.has(a.id))
      })).filter(group => group.activities.length > 0));
    }
  }, [initialActivities, freshSuggestions, initialUserSuggestions, deletedIds]);

  const handleDeleteActivity = async (activityId: string) => {
    try {
      // Try to delete from database (works for DB-stored suggestions)
      try {
        await fetch('/api/activities', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activityId })
        });
      } catch {
        // Ignore — may be a curated (non-DB) activity
      }

      // Persist deletion for curated activities
      const newDeletedIds = new Set(deletedIds);
      newDeletedIds.add(activityId);
      setDeletedIds(newDeletedIds);
      localStorage.setItem('vh-deleted-activities', JSON.stringify([...newDeletedIds]));

      // Also remove from localStorage suggestions
      const storedSuggestions = localStorage.getItem('vh-activity-suggestions');
      const userSuggestions: ActivitySuggestion[] = storedSuggestions ? JSON.parse(storedSuggestions) : [];
      const filteredSuggestions = userSuggestions.filter(s => s.id !== activityId);
      localStorage.setItem('vh-activity-suggestions', JSON.stringify(filteredSuggestions));
      
      // Update state immediately for better UX
      const updatedActivities = activities.map(category => ({
        ...category,
        activities: category.activities.filter(activity => activity.id !== activityId)
      })).filter(category => category.activities.length > 0);
      
      setActivities(updatedActivities);
      
    } catch (error) {
      console.error('Error deleting activity:');
      const updatedActivities = activities.map(category => ({
        ...category,
        activities: category.activities.filter(activity => activity.id !== activityId)
      })).filter(category => category.activities.length > 0);
      
      setActivities(updatedActivities);
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
  };

  const handleUpdateActivity = async (updatedActivity: Activity) => {
    const updatedActivities = activities.map(category => ({
      ...category,
      activities: category.activities.map(activity => 
        activity.id === updatedActivity.id ? updatedActivity : activity
      )
    }));
    
    setActivities(updatedActivities);
    setEditingActivity(null);
    
    // Update DB if it's a user-submitted activity with a numeric DB id
    if (updatedActivity.isUserSubmitted) {
  
    const numericId = Number(updatedActivity.id);
      if (!isNaN(numericId) && String(numericId) === String(updatedActivity.id)) {
        try {
          await fetch('/api/activities', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: numericId,
              title: updatedActivity.name,
              description: updatedActivity.description,
              location: updatedActivity.location,
              url: updatedActivity.website || '',
              suggested_by: updatedActivity.submittedBy || ''
            })
          });
        } catch (error) {
          console.error('Error updating activity in DB:');
        }
      }
      // Also update localStorage as a fallback
      const storedSuggestions = localStorage.getItem('vh-activity-suggestions');
      const userSuggestions: ActivitySuggestion[] = storedSuggestions ? JSON.parse(storedSuggestions) : [];
      const updatedSuggestions = userSuggestions.map(suggestion => 
        suggestion.id === updatedActivity.id ? {
          ...suggestion,
          activity_name: updatedActivity.name,
          description: updatedActivity.description,
          location: updatedActivity.location,
          website: updatedActivity.website || '',
          notes: updatedActivity.notes || ''
        } : suggestion
      );
      localStorage.setItem('vh-activity-suggestions', JSON.stringify(updatedSuggestions));
    }
  };

  return (
    <div className="container space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="badge badge-primary mb-4">🎆 Things to Do</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
          Things to Do{destination ? ` in ` : ''}{destination ? <span className="text-gradient">{destination}</span> : <span className="text-gradient"></span>}
        </h1>
        <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'var(--text-secondary)' }}>
          Discover the best activities, restaurants, and attractions{destination ? ` in ${destination}` : ''}.
        </p>
        
        {/* Suggestion Form Toggle */}
        <button
          onClick={() => setShowSuggestionForm(!showSuggestionForm)}
          className="btn btn-primary"
        >
          {showSuggestionForm ? '❌ Close Form' : '💡 Suggest an Activity'}
        </button>
      </div>
      
      {/* Activity Suggestion Form */}
      {showSuggestionForm && (
        <div className="mb-8">
          <ActivitySuggestionForm 
            onClose={() => setShowSuggestionForm(false)} 
            onSuccess={refreshData}
          />
        </div>
      )}
      
      {/* Activities by Category */}
      <div className="space-y-12">
        {activities
          .filter(categoryGroup => categoryGroup.activities.length > 0) // Only show categories with activities
          .map((categoryGroup, index) => (
          <div key={categoryGroup.category} className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{categoryGroup.icon}</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                {categoryGroup.category}
              </h2>
            </div>
            
            <div className="space-y-8">
              {categoryGroup.activities.map((activity, activityIndex) => (
                <ActivityCard
                  key={activity.id || `${categoryGroup.category}-${activityIndex}`}
                  activity={activity}
                  categoryIcon={categoryGroup.icon}
                  categoryIndex={index}
                  activityIndex={activityIndex}
                  categoryName={categoryGroup.category}
                  onDelete={handleDeleteActivity}
                  onEdit={handleEditActivity}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Edit Activity Modal */}
      {editingActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-card)' }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Edit Activity</h2>
                <button
                  onClick={() => setEditingActivity(null)}
                  className="text-2xl transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updatedActivity: Activity = {
                  ...editingActivity,
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                  location: formData.get('location') as string,
                  website: formData.get('website') as string || undefined,
                  notes: formData.get('notes') as string || undefined,
                };
                handleUpdateActivity(updatedActivity);
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Activity Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingActivity.name}
                    required
                    className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                  <textarea
                    name="description"
                    defaultValue={editingActivity.description}
                    required
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Location</label>
                  <input
                    type="text"
                    name="location"
                    defaultValue={editingActivity.location}
                    required
                    className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Website (optional)</label>
                  <input
                    type="text"
                    name="website"
                    defaultValue={editingActivity.website || ''}
                    placeholder="example.com or https://example.com"
                    className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Notes (optional)</label>
                  <textarea
                    name="notes"
                    defaultValue={editingActivity.notes || ''}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingActivity(null)}
                    className="px-4 py-2 font-medium transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-white font-medium rounded-lg transition-colors"
                    style={{ background: 'var(--brand)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--brand)'; }}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
