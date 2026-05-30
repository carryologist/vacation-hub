'use client'
import { useState, useEffect } from 'react'
import { TravelNote } from '../../lib/db'
import { formatDisplayDate } from '../../lib/dateUtils'

interface TravelNotesClientProps {
  tripName: string;
  arrivalMin: string;
  arrivalMax: string;
  departureMin: string;
  departureMax: string;
}

export default function TravelNotesClient({
  tripName,
  arrivalMin,
  arrivalMax,
  departureMin,
  departureMax,
}: TravelNotesClientProps) {
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [travelNotes, setTravelNotes] = useState<TravelNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState<TravelNote | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)

  useEffect(() => {
    loadTravelNotes()
  }, [])

  const loadTravelNotes = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/travel-notes/')
      if (!res.ok) throw new Error('Failed to fetch travel notes')
      const data = await res.json()

      setTravelNotes(data || [])
      setLoading(false)
    } catch (err) {
      console.error('Error loading travel notes:', err)
      setError(`Failed to load travel notes: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setLoading(false)
      setTravelNotes([])
    }
  }

  async function onSubmit(formData: FormData) {
    setSubmitting(true)
    setStatus(null)

    try {
      const data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string || undefined,
        coming_from: formData.get('coming_from') as string,
        arrival_date: formData.get('arrival_date') as string,
        departure_date: formData.get('departure_date') as string || undefined,
        transportation: formData.get('transportation') as string,
        notes: formData.get('notes') as string || undefined,
      }

      if (editingNote) {
        const res = await fetch('/api/travel-notes/', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingNote.id, ...data })
        })

        if (!res.ok) throw new Error('Failed to update travel note')
        const updatedNote = await res.json()

        setTravelNotes(prevNotes => prevNotes.map(n => n.id === editingNote.id ? updatedNote : n))
      } else {
        const res = await fetch('/api/travel-notes/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })

        if (!res.ok) throw new Error('Failed to save travel note')
        const newNote = await res.json()

        setTravelNotes(prevNotes => [newNote, ...prevNotes])
      }

      setStatus('✅ Travel note saved! Your group can now see your travel plans.')
      ;(document.getElementById('travel-notes-form') as HTMLFormElement)?.reset()
      setEditingNote(null)

      setTimeout(() => setStatus(null), 3000)
    } catch (err) {
      console.error('Error saving travel note:', err)
      setStatus('❌ Failed to save travel note. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (note: TravelNote) => {
    if (!note.id) {
      console.error('Cannot edit: Note has no ID')
      setStatus('❌ Cannot edit: Note has no ID')
      return
    }

    setEditingNote(note)
    setStatus(null)

    const form = document.getElementById('travel-notes-form') as HTMLFormElement
    if (form) {
      ;(form.elements.namedItem('name') as HTMLInputElement).value = note.name
      ;(form.elements.namedItem('email') as HTMLInputElement).value = note.email || ''
      ;(form.elements.namedItem('coming_from') as HTMLInputElement).value = note.coming_from
      ;(form.elements.namedItem('arrival_date') as HTMLInputElement).value = note.arrival_date?.includes('T') ? note.arrival_date.split('T')[0] : note.arrival_date
      ;(form.elements.namedItem('departure_date') as HTMLInputElement).value = note.departure_date ? (note.departure_date.includes('T') ? note.departure_date.split('T')[0] : note.departure_date) : ''
      ;(form.elements.namedItem('transportation') as HTMLSelectElement).value = note.transportation
      ;(form.elements.namedItem('notes') as HTMLTextAreaElement).value = note.notes || ''
    }

    form?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
    setStatus(null)
    ;(document.getElementById('travel-notes-form') as HTMLFormElement)?.reset()
  }

  const handleDelete = async (id: number) => {
    if (!id) {
      console.error('No note ID provided for deletion')
      setStatus('❌ Cannot delete: Invalid note ID.')
      return
    }

    try {
      const res = await fetch('/api/travel-notes/', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (!res.ok) throw new Error('Failed to delete travel note')

      setTravelNotes(prevNotes => prevNotes.filter(note => note.id !== id))

      setStatus('✅ Travel note deleted successfully.')
      setShowDeleteConfirm(null)

      setTimeout(() => setStatus(null), 3000)
    } catch (err) {
      console.error('Error deleting travel note:', err)
      setStatus(`❌ Failed to delete travel note: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setShowDeleteConfirm(null)
    }
  }

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }

  const inputFocusClass = "w-full min-w-0 rounded-lg px-4 py-3 placeholder-opacity-50 focus:outline-none transition-all"

  return (
    <div className="container space-y-8 animate-fade-in overflow-x-hidden">
      {/* Header */}
      <div className="text-center">
        <div className="badge badge-primary mb-4">✈️ Travel Plans</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
          <span className="text-gradient">Travel Coordination</span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Share where you&apos;re coming from and when so we can coordinate rides and arrivals!
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 min-w-0">
        {/* Travel Notes Form */}
        <div className="rounded-2xl p-4 sm:p-6 min-w-0 overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            {editingNote ? 'Edit Travel Plans' : 'Share Your Travel Plans'}
          </h2>

          {editingNote && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent-blue) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-blue) 25%, transparent)' }}>
              <p className="text-sm" style={{ color: 'var(--accent-blue)' }}>
                ✏️ Editing travel plans for <strong>{editingNote.name}</strong>
              </p>
            </div>
          )}

          <form id="travel-notes-form" action={onSubmit} className="space-y-6 min-w-0 overflow-hidden">
            <div className="grid md:grid-cols-2 gap-4 min-w-0">
              <div className="min-w-0 overflow-hidden">
                <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Your Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className={inputFocusClass}
                  style={{ ...inputStyle }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  placeholder="Your name"
                />
              </div>

              <div className="min-w-0 overflow-hidden">
                <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Email (optional)
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={inputFocusClass}
                  style={{ ...inputStyle }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="coming_from" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Coming From *
              </label>
              <input
                type="text"
                id="coming_from"
                name="coming_from"
                required
                className={inputFocusClass}
                style={{ ...inputStyle }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                placeholder="City, State/Province, Country"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 min-w-0">
              <div className="min-w-0 overflow-hidden">
                <label htmlFor="arrival_date" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Arrival Date *
                </label>
                <input
                  type="date"
                  id="arrival_date"
                  name="arrival_date"
                  required
                  min={arrivalMin || undefined}
                  max={arrivalMax || undefined}
                  className={`${inputFocusClass} max-w-full`}
                  style={{ ...inputStyle, maxWidth: '100%', WebkitAppearance: 'none' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <div className="min-w-0 overflow-hidden">
                <label htmlFor="departure_date" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Departure Date (optional)
                </label>
                <input
                  type="date"
                  id="departure_date"
                  name="departure_date"
                  min={departureMin || undefined}
                  max={departureMax || undefined}
                  className={`${inputFocusClass} max-w-full`}
                  style={{ ...inputStyle, maxWidth: '100%', WebkitAppearance: 'none' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="transportation" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Transportation *
              </label>
              <select
                id="transportation"
                name="transportation"
                required
                className={inputFocusClass}
                style={{ ...inputStyle }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <option value="">Select transportation method</option>
                <option value="Flying">Flying ✈️</option>
                <option value="Driving">Driving 🚗</option>
                <option value="Train">Train 🚆</option>
                <option value="Bus">Bus 🚌</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                className={`${inputFocusClass} resize-none`}
                style={{ ...inputStyle }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                placeholder="Flight details, car space available, coordination notes, etc."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
              style={{ background: submitting ? 'color-mix(in srgb, var(--brand) 60%, transparent)' : 'linear-gradient(135deg, var(--brand), var(--brand-hover))', cursor: submitting ? 'not-allowed' : 'pointer' }}
              onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = 'var(--brand-hover)'; }}
              onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = 'linear-gradient(135deg, var(--brand), var(--brand-hover))'; }}
            >
              {submitting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {editingNote ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>{editingNote ? '✏️ Update Travel Plans' : '✈️ Share Travel Plans'}</>
              )}
            </button>

            {editingNote && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-full font-semibold py-3 px-6 rounded-lg transition-colors"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                ❌ Cancel Edit
              </button>
            )}

            {status && (
              <div className="p-4 rounded-lg text-sm" style={
                status.includes('✅')
                  ? { background: 'color-mix(in srgb, var(--accent-green) 15%, transparent)', color: 'var(--accent-green)' }
                  : { background: 'color-mix(in srgb, var(--accent-red) 15%, transparent)', color: 'var(--accent-red)' }
              }>
                {status}
              </div>
            )}
          </form>
        </div>

        {/* Existing Travel Notes */}
        <div className="rounded-2xl p-4 sm:p-6 min-w-0 overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-6 gap-2">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Group Travel Plans</h2>
            <button
              onClick={loadTravelNotes}
              disabled={loading}
              className="text-sm px-3 py-1 rounded transition-colors flex items-center gap-3"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              title="Refresh travel plans"
            >
              {loading ? (
                <div className="animate-spin w-3 h-3 border rounded-full" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }}></div>
              ) : (
                '🔄'
              )}
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 rounded-full mx-auto mb-4" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}></div>
              <p style={{ color: 'var(--text-muted)' }}>Loading travel plans...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="mb-4" style={{ color: 'var(--accent-red)' }}>⚠️</div>
              <p className="mb-2" style={{ color: 'var(--accent-red)' }}>{error}</p>
              <button
                onClick={loadTravelNotes}
                className="text-white px-4 py-2 rounded-lg text-sm mt-2"
                style={{ background: 'var(--brand)' }}
              >
                Try Again
              </button>
            </div>
          ) : travelNotes.length === 0 ? (
            <div className="text-center py-8">
              <p className="mb-4" style={{ color: 'var(--text-muted)' }}>No travel plans shared yet.</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Be the first to share your travel details!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {travelNotes.map((note) => (
                <div key={note.id} className="rounded-lg p-4 relative" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h3 className="font-semibold min-w-0 break-words" style={{ color: 'var(--text-primary)' }}>{note.name}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {new Date(note.created_at!).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleEdit(note)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: 'var(--accent-blue)' }}
                          title="Edit travel plans"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => {
                            if (note.id) {
                              setShowDeleteConfirm(note.id)
                            } else {
                              console.error('Cannot delete: Note has no ID')
                              setStatus('❌ Cannot delete: Note has no ID')
                            }
                          }}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: 'var(--accent-red)' }}
                          title="Delete travel plans"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Delete Confirmation Dialog */}
                  {showDeleteConfirm === note.id && (
                    <div className="absolute inset-0 rounded-lg flex items-center justify-center p-4" style={{ background: 'color-mix(in srgb, var(--bg-card) 95%, transparent)', backdropFilter: 'blur(4px)' }}>
                      <div className="text-center space-y-4">
                        <div className="text-2xl" style={{ color: 'var(--accent-red)' }}>⚠️</div>
                        <div>
                          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Delete travel plans?</p>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>This action cannot be undone.</p>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => {
                              if (note.id) {
                                handleDelete(note.id)
                              } else {
                                console.error('Cannot delete: No valid ID')
                                setStatus('❌ Cannot delete: No valid ID')
                                setShowDeleteConfirm(null)
                              }
                            }}
                            className="text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                            style={{ background: 'var(--accent-red)' }}
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-4 py-2 rounded text-sm font-medium transition-colors"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>From:</span>
                      <span className="break-words min-w-0" style={{ color: 'var(--text-primary)' }}>{note.coming_from}</span>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>Arriving:</span>
                      <span className="break-words min-w-0" style={{ color: 'var(--text-primary)' }}>
                        {formatDisplayDate(note.arrival_date)}
                      </span>
                    </div>

                    {note.departure_date && (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>Departing:</span>
                        <span className="break-words min-w-0" style={{ color: 'var(--text-primary)' }}>
                          {formatDisplayDate(note.departure_date)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>Transport:</span>
                      <span className="break-words min-w-0" style={{ color: 'var(--text-primary)' }}>{note.transportation}</span>
                    </div>

                    {note.email && (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>Email:</span>
                        <span className="break-all min-w-0" style={{ color: 'var(--text-primary)' }}>{note.email}</span>
                      </div>
                    )}

                    {note.notes && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{note.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
