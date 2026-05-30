'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  created_at: string;
}

interface Activity {
  id?: string;
  name: string;
  description: string;
  location: string;
  website?: string;
  highlights?: string[];
  isUserSubmitted?: boolean;
  submittedBy?: string;
  notes?: string;
  category?: string;
}

interface VoteSummary {
  activity_id: number;
  upvotes: number;
  downvotes: number;
  score: number;
}

type SortMode = 'category' | 'popularity';

interface CategoryGroup {
  category: string;
  icon: string;
  activities: Activity[];
}

function ActivityCard({
  activity,
  categoryName,
  onDelete,
  onEdit,
  voteSummary,
  onVote,
  voteLoading,
}: {
  activity: Activity
  categoryName?: string
  onDelete?: (activityId: string) => void
  onEdit?: (activity: Activity) => void
  voteSummary?: VoteSummary
  onVote: (activityId: string, vote: 1 | -1) => void
  voteLoading: boolean
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!activity.id || !onDelete) return
    if (confirm(`Are you sure you want to delete "${activity.name}"? This action cannot be undone.`)) {
      setIsDeleting(true)
      try {
        await onDelete(activity.id)
      } catch {
        alert('Failed to delete activity. Please try again.')
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const score = voteSummary?.score ?? 0;

  return (
    <div
      className="rounded-xl p-4 sm:p-5 transition-all"
      style={{
        background: 'var(--bg-card)',
        border: activity.isUserSubmitted
          ? '2px solid var(--brand)'
          : '1px solid var(--border)',
      }}
    >
      <div className="flex gap-4">
        {/* Vote column */}
        {activity.id && (
          <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
            <button
              onClick={() => activity.id && onVote(activity.id, 1)}
              disabled={voteLoading}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
              style={{ background: 'color-mix(in srgb, #10b981 10%, transparent)' }}
              title="Upvote"
            >
              👍
            </button>
            <span
              className="text-sm font-bold tabular-nums min-w-[1.5rem] text-center"
              style={{
                color: score > 0 ? '#10b981' : score < 0 ? '#ef4444' : 'var(--text-muted)',
              }}
            >
              {score > 0 ? `+${score}` : score}
            </span>
            <button
              onClick={() => activity.id && onVote(activity.id, -1)}
              disabled={voteLoading}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
              style={{ background: 'color-mix(in srgb, #ef4444 10%, transparent)' }}
              title="Downvote"
            >
              👎
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {activity.name}
            </h3>
            {/* Action buttons */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {onEdit && (
                <button
                  onClick={() => onEdit(activity)}
                  className="p-1.5 rounded-lg transition-colors text-sm"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                  title="Edit"
                >
                  ✏️
                </button>
              )}
              {onDelete && activity.id && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-1.5 rounded-lg transition-colors text-sm disabled:opacity-50"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { if (!isDeleting) { e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.background = 'var(--bg-elevated)'; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                  title="Delete"
                >
                  {isDeleting ? '⏳' : '🗑️'}
                </button>
              )}
            </div>
          </div>

          <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {activity.description}
          </p>

          {activity.highlights && activity.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {activity.highlights.map((highlight, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}
                >
                  {highlight}
                </span>
              ))}
            </div>
          )}

          {activity.notes && (
            <div
              className="rounded-lg p-2.5 mt-2 text-sm"
              style={{ background: 'var(--brand-light)', border: '1px solid color-mix(in srgb, var(--brand) 20%, transparent)' }}
            >
              <strong>💡</strong> {activity.notes}
            </div>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            {activity.location && (
              <span>📍 {activity.location}</span>
            )}
            {activity.isUserSubmitted && activity.submittedBy && (
              <span>Suggested by {activity.submittedBy}</span>
            )}
            {categoryName && (
              <span
                className="px-2 py-0.5 rounded-full"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                {categoryName}
              </span>
            )}
            {activity.website && (
              <a
                href={activity.website}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium transition-colors"
                style={{ color: 'var(--brand)' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Visit Website →
              </a>
            )}
          </div>

          {/* Vote details - small text under meta */}
          {voteSummary && (voteSummary.upvotes > 0 || voteSummary.downvotes > 0) && (
            <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {voteSummary.upvotes > 0 && (
                <span style={{ color: '#10b981' }}>{voteSummary.upvotes} upvote{voteSummary.upvotes !== 1 ? 's' : ''}</span>
              )}
              {voteSummary.downvotes > 0 && (
                <span style={{ color: '#ef4444' }}>{voteSummary.downvotes} downvote{voteSummary.downvotes !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ThingsToDoClient({
  initialActivities,
  initialUserSuggestions,
  destination,
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

  const [voteSummaries, setVoteSummaries] = useState<VoteSummary[]>([])
  const [sortMode, setSortMode] = useState<SortMode>('category')
  const [voterName, setVoterName] = useState<string | null>(() => {
    try {
      return localStorage.getItem('vh-voter-name');
    } catch {
      return null;
    }
  })
  const [showNamePrompt, setShowNamePrompt] = useState(false)
  const [pendingVote, setPendingVote] = useState<{ activityId: string; vote: 1 | -1 } | null>(null)
  const [voteLoading, setVoteLoading] = useState(false)

  // Use a ref for voterName so the vote handler always has the latest value
  const voterNameRef = useRef(voterName);
  useEffect(() => { voterNameRef.current = voterName; }, [voterName]);

  // Fetch fresh suggestions from database
  const fetchFreshSuggestions = async () => {
    try {
      const res = await fetch('/api/activities/');
      if (!res.ok) throw new Error('Failed to fetch activities');
      const data: DbActivitySuggestion[] = await res.json();

      const mapped = data.map(suggestion => ({
        id: suggestion.id?.toString() || Date.now().toString(),
        name: suggestion.suggested_by || 'Anonymous',
        activity_name: suggestion.title,
        description: suggestion.description,
        location: suggestion.location || '',
        website: suggestion.url || '',
        category: suggestion.category,
        notes: suggestion.notes || '',
        created_at: suggestion.created_at || new Date().toISOString()
      }));

      // Fuzzy deduplicate
      const freshUserSuggestions: typeof mapped = [];
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const significantWords = (s: string) =>
        normalize(s).split(/\s+/).filter(w => w.length > 2 && !['the','and','for','tour','show','visit','trip','experience','at','of','in','to','a','hot','chicken','bar','grill','restaurant','house','place','center','museum','park','cafe','club','hall'].includes(w));

      for (const item of mapped) {
        const norm = normalize(item.activity_name);
        const words = significantWords(item.activity_name);
        const isDupe = freshUserSuggestions.some(existing => {
          const existingNorm = normalize(existing.activity_name);
          if (existingNorm.includes(norm) || norm.includes(existingNorm)) return true;
          const existingWords = significantWords(existing.activity_name);
          const shared = words.filter(w => existingWords.includes(w)).length;
          const shorter = Math.min(words.length, existingWords.length);
          if (shorter >= 2 && shared >= Math.ceil(shorter * 0.6)) return true;
          return false;
        });
        if (!isDupe) freshUserSuggestions.push(item);
      }

      setFreshSuggestions(freshUserSuggestions);
    } catch {
      console.error('Failed to fetch fresh activity suggestions:');
    }
  };

  // Fetch vote summaries
  const fetchVotes = useCallback(async () => {
    try {
      const res = await fetch('/api/activities/vote/');
      if (!res.ok) return;
      const data: VoteSummary[] = await res.json();
      setVoteSummaries(data);
    } catch {
      // Non-critical
    }
  }, []);

  // Cast a vote — uses ref so it always sees the latest voterName
  const castVote = useCallback(async (activityId: string, vote: 1 | -1, name: string) => {
    setVoteLoading(true);
    try {
      await fetch('/api/activities/vote/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: Number(activityId),
          voter_name: name,
          vote,
        }),
      });
      await fetchVotes();
    } catch {
      console.error('Failed to cast vote');
    } finally {
      setVoteLoading(false);
    }
  }, [fetchVotes]);

  // Handle vote button click — prompts for name if needed
  const handleVote = useCallback((activityId: string, vote: 1 | -1) => {
    const currentName = voterNameRef.current;
    if (!currentName) {
      setPendingVote({ activityId, vote });
      setShowNamePrompt(true);
      return;
    }
    castVote(activityId, vote, currentName);
  }, [castVote]);

  // When voter name is submitted, fire the pending vote
  const handleNameSubmit = useCallback((name: string) => {
    setVoterName(name);
    voterNameRef.current = name;
    localStorage.setItem('vh-voter-name', name);
    setShowNamePrompt(false);
    if (pendingVote) {
      castVote(pendingVote.activityId, pendingVote.vote, name);
      setPendingVote(null);
    }
  }, [pendingVote, castVote]);

  // Get vote summary for a specific activity
  const getVoteSummary = useCallback((activityId: string): VoteSummary | undefined => {
    return voteSummaries.find(v => v.activity_id === Number(activityId));
  }, [voteSummaries]);

  const refreshData = async () => {
    await fetchFreshSuggestions();
    await fetchVotes();
  };

  // Initial load
  useEffect(() => {
    fetchFreshSuggestions();
    fetchVotes();
  }, [fetchVotes]);

  // Merge suggestions into categories
  useEffect(() => {
    let allUserSuggestions: ActivitySuggestion[] = [];

    if (freshSuggestions.length > 0) {
      allUserSuggestions = [...freshSuggestions];
    } else {
      const storedSuggestions = localStorage.getItem('vh-activity-suggestions');
      if (storedSuggestions && initialUserSuggestions.length > 0) {
        const localSuggestions: ActivitySuggestion[] = JSON.parse(storedSuggestions);
        const filteredLocalSuggestions = localSuggestions.filter(localSugg =>
          !initialUserSuggestions.some(dbSugg =>
            dbSugg.activity_name.toLowerCase().trim() === localSugg.activity_name.toLowerCase().trim()
          )
        );
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
      const updatedActivities = initialActivities.map(group => ({
        ...group,
        activities: group.activities.filter(a => !a.id || !deletedIds.has(a.id))
      }));

      allUserSuggestions.forEach(suggestion => {
        const categoryIndex = updatedActivities.findIndex(group => group.category === suggestion.category);

        const userActivity: Activity = {
          id: suggestion.id,
          name: suggestion.activity_name,
          description: suggestion.description,
          location: suggestion.location,
          website: suggestion.website || undefined,
          isUserSubmitted: true,
          submittedBy: suggestion.name,
          notes: suggestion.notes || undefined,
          category: suggestion.category
        };

        if (categoryIndex >= 0) {
          const existingActivity = updatedActivities[categoryIndex].activities.find(
            activity => activity.id === userActivity.id ||
            (activity.name.toLowerCase().trim() === userActivity.name.toLowerCase().trim() &&
             activity.description.toLowerCase().trim() === userActivity.description.toLowerCase().trim())
          );
          if (!existingActivity) {
            updatedActivities[categoryIndex].activities.push(userActivity);
          }
        } else {
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
      setActivities(initialActivities.map(group => ({
        ...group,
        activities: group.activities.filter(a => !a.id || !deletedIds.has(a.id))
      })).filter(group => group.activities.length > 0));
    }
  }, [initialActivities, freshSuggestions, initialUserSuggestions, deletedIds]);

  // Compute display order based on sort mode
  const displayActivities = useMemo(() => {
    const nonEmpty = activities.filter(cg => cg.activities.length > 0);

    const getScore = (a: Activity) => {
      if (!a.id) return 0;
      const vs = voteSummaries.find(v => v.activity_id === Number(a.id));
      return vs?.score ?? 0;
    };

    if (sortMode === 'popularity') {
      const all = nonEmpty.flatMap(cg =>
        cg.activities.map(a => ({ ...a, _categoryName: cg.category }))
      );
      all.sort((a, b) => getScore(b) - getScore(a));
      return [{ category: 'Most Popular', icon: '🔥', activities: all }];
    }

    // Category mode: sort activities within each category by popularity
    return nonEmpty.map(cg => ({
      ...cg,
      activities: [...cg.activities].sort((a, b) => getScore(b) - getScore(a)),
    }));
  }, [activities, voteSummaries, sortMode]);

  const handleDeleteActivity = async (activityId: string) => {
    try {
      try {
        await fetch('/api/activities/', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activityId })
        });
      } catch {
        // May be a curated (non-DB) activity
      }

      const newDeletedIds = new Set(deletedIds);
      newDeletedIds.add(activityId);
      setDeletedIds(newDeletedIds);
      localStorage.setItem('vh-deleted-activities', JSON.stringify([...newDeletedIds]));

      const storedSuggestions = localStorage.getItem('vh-activity-suggestions');
      const userSuggestions: ActivitySuggestion[] = storedSuggestions ? JSON.parse(storedSuggestions) : [];
      const filteredSuggestions = userSuggestions.filter(s => s.id !== activityId);
      localStorage.setItem('vh-activity-suggestions', JSON.stringify(filteredSuggestions));

      const updatedActivities = activities.map(category => ({
        ...category,
        activities: category.activities.filter(activity => activity.id !== activityId)
      })).filter(category => category.activities.length > 0);
      setActivities(updatedActivities);
    } catch {
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

    if (updatedActivity.isUserSubmitted) {
      const numericId = Number(updatedActivity.id);
      if (!isNaN(numericId) && String(numericId) === String(updatedActivity.id)) {
        try {
          await fetch('/api/activities/', {
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
        } catch {
          console.error('Error updating activity in DB:');
        }
      }
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

  const totalActivities = activities.reduce((sum, cg) => sum + cg.activities.length, 0);

  return (
    <div className="container space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="badge badge-primary mb-4">🎆 Things to Do</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
          Things to Do{destination ? ` in ` : ''}{destination ? <span className="text-gradient">{destination}</span> : <span className="text-gradient"></span>}
        </h1>
        <p className="text-lg max-w-2xl mx-auto mb-6" style={{ color: 'var(--text-secondary)' }}>
          Suggest activities, vote on your favorites, and plan together.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setShowSuggestionForm(!showSuggestionForm)}
            className="btn btn-primary"
          >
            {showSuggestionForm ? '✕ Close' : '+ Suggest an Activity'}
          </button>

          {/* Sort toggle */}
          <div
            className="inline-flex rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            <button
              onClick={() => setSortMode('category')}
              className="px-4 py-2 text-sm font-medium transition-all"
              style={{
                background: sortMode === 'category' ? 'var(--brand)' : 'var(--bg-elevated)',
                color: sortMode === 'category' ? 'white' : 'var(--text-secondary)',
              }}
            >
              By Type
            </button>
            <button
              onClick={() => setSortMode('popularity')}
              className="px-4 py-2 text-sm font-medium transition-all"
              style={{
                background: sortMode === 'popularity' ? 'var(--brand)' : 'var(--bg-elevated)',
                color: sortMode === 'popularity' ? 'white' : 'var(--text-secondary)',
                borderLeft: '1px solid var(--border)',
              }}
            >
              By Popularity
            </button>
          </div>
        </div>

        {/* Activity count */}
        {totalActivities > 0 && (
          <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
            {totalActivities} activit{totalActivities === 1 ? 'y' : 'ies'} suggested
          </p>
        )}
      </div>

      {/* Suggestion Form */}
      {showSuggestionForm && (
        <ActivitySuggestionForm
          onClose={() => setShowSuggestionForm(false)}
          onSuccess={refreshData}
        />
      )}

      {/* Activities */}
      {totalActivities === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border)' }}
        >
          <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            No activities yet
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Be the first to suggest something for the group!
          </p>
          <button
            onClick={() => setShowSuggestionForm(true)}
            className="btn btn-primary"
          >
            + Suggest an Activity
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {displayActivities.map((categoryGroup) => (
            <div key={categoryGroup.category} className="space-y-3">
              <div className="flex items-center gap-2.5 px-1">
                <span className="text-2xl">{categoryGroup.icon}</span>
                <h2 className="font-display text-xl sm:text-2xl font-bold">
                  {categoryGroup.category}
                </h2>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                >
                  {categoryGroup.activities.length}
                </span>
              </div>

              <div className="space-y-2">
                {categoryGroup.activities.map((activity, activityIndex) => (
                  <ActivityCard
                    key={activity.id || `${categoryGroup.category}-${activityIndex}`}
                    activity={activity}
                    categoryName={sortMode === 'popularity' ? activity.category : undefined}
                    onDelete={handleDeleteActivity}
                    onEdit={handleEditActivity}
                    voteSummary={activity.id ? getVoteSummary(activity.id) : undefined}
                    onVote={handleVote}
                    voteLoading={voteLoading}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Activity Modal */}
      {editingActivity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Activity</h2>
                <button
                  onClick={() => setEditingActivity(null)}
                  className="text-2xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                handleUpdateActivity({
                  ...editingActivity,
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                  location: formData.get('location') as string,
                  website: formData.get('website') as string || undefined,
                  notes: formData.get('notes') as string || undefined,
                });
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Activity Name</label>
                  <input type="text" name="name" defaultValue={editingActivity.name} required
                    className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                  <textarea name="description" defaultValue={editingActivity.description} required rows={3}
                    className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all resize-none"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Location</label>
                    <input type="text" name="location" defaultValue={editingActivity.location}
                      className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Website</label>
                    <input type="text" name="website" defaultValue={editingActivity.website || ''} placeholder="example.com"
                      className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Notes</label>
                  <textarea name="notes" defaultValue={editingActivity.notes || ''} rows={2}
                    className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all resize-none"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => setEditingActivity(null)}
                    className="px-4 py-2 font-medium rounded-lg transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Voter Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="rounded-xl shadow-xl max-w-sm w-full p-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <h3 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              What&apos;s your name?
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Your name is shown with your votes so the group knows who&apos;s interested.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const name = (fd.get('voterName') as string || '').trim();
                if (!name) return;
                handleNameSubmit(name);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                name="voterName"
                required
                maxLength={100}
                placeholder="e.g., Sarah"
                autoFocus
                className="w-full px-3 py-2 rounded-lg focus:outline-none transition-all"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowNamePrompt(false); setPendingVote(null); }}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-sm">
                  Save &amp; Vote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
