'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface Photo {
  id: number
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  width: number | null
  height: number | null
  uploaded_by: string
  uploaded_at: string
  storage_path: string
  public_url: string
  description: string | null
}

interface PhotoGalleryProps {
  refreshTrigger: number
}

const PhotoGallery = ({ refreshTrigger }: PhotoGalleryProps) => {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())
  const [editingIds, setEditingIds] = useState<Set<number>>(new Set())
  const [editingNames, setEditingNames] = useState<Record<number, string>>({})

  const PHOTOS_PER_PAGE = 20

  const fetchPhotos = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    try {
      const res = await fetch(`/api/photos/?limit=${PHOTOS_PER_PAGE}&offset=${pageNum * PHOTOS_PER_PAGE}`)
      if (!res.ok) throw new Error('Failed to fetch photos')
      const { photos: data } = await res.json()

      if (data) {
        if (append) {
          setPhotos(prev => [...prev, ...data])
        } else {
          setPhotos(data)
        }
        
        setHasMore(data.length === PHOTOS_PER_PAGE)
        setPage(pageNum)
      }
    } catch {
      console.error('Error fetching photos:')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true)
      fetchPhotos(page + 1, true)
    }
  }, [page, loadingMore, hasMore, fetchPhotos])

  const handleDownload = async (photo: Photo) => {
    try {
      // Create a temporary link to download the image
      const response = await fetch(photo.public_url)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = photo.original_filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      console.error('Download failed:')
      alert('Failed to download photo. Please try again.')
    }
  }

  const handleDelete = async (photo: Photo) => {
    if (!confirm(`Are you sure you want to delete "${photo.original_filename}"? This action cannot be undone.`)) {
      return
    }

    setDeletingIds(prev => new Set([...prev, photo.id]))

    try {
      const res = await fetch('/api/photos/', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photo.id }),
      })
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to delete photo.')
        return
      }

      // Remove from local state
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      
    } catch {
      console.error('Delete failed:')
      alert('Failed to delete photo. Please try again.')
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(photo.id)
        return newSet
      })
    }
  }

  const handleEditName = (photo: Photo) => {
    setEditingIds(prev => new Set([...prev, photo.id]))
    setEditingNames(prev => ({ ...prev, [photo.id]: photo.original_filename }))
  }

  const handleSaveName = async (photo: Photo) => {
    const newName = editingNames[photo.id]
    if (!newName || newName.trim() === '') {
      handleCancelEdit(photo.id)
      return
    }

    try {
      const res = await fetch('/api/photos/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photo.id, original_filename: newName.trim() }),
      })
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Failed to update photo name.')
        return
      }

      // Update local state
      setPhotos(prev => prev.map(p => 
        p.id === photo.id ? { ...p, original_filename: newName.trim() } : p
      ))
      
      handleCancelEdit(photo.id)
      
    } catch {
      console.error('Failed to update photo name:')
      alert('Failed to update photo name. Please try again.')
    }
  }

  const handleCancelEdit = (photoId: number) => {
    setEditingIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(photoId)
      return newSet
    })
    setEditingNames(prev => {
      const newNames = { ...prev }
      delete newNames[photoId]
      return newNames
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop 
          >= document.documentElement.offsetHeight - 1000) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore])

  // Initial load and refresh
  useEffect(() => {
    fetchPhotos(0, false)
  }, [fetchPhotos, refreshTrigger])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}></div>
        <span className="ml-3" style={{ color: 'var(--text-secondary)' }}>Loading photos...</span>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📷</div>
        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          No Photos Yet
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Be the first to share a photo from your trip!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {photos.map((photo) => {
          const isDeleting = deletingIds.has(photo.id)
          const aspectRatio = photo.width && photo.height ? photo.width / photo.height : 1
          
          return (
            <div 
              key={photo.id} 
              className={`rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg ${
                isDeleting ? 'opacity-50 pointer-events-none' : ''
              }`}
              style={{ background: 'var(--bg-card)' }}
            >
              {/* Photo */}
              <div className="relative" style={{ aspectRatio: Math.max(0.5, Math.min(2, aspectRatio)) }}>
                <Image
                  src={photo.public_url}
                  alt={photo.original_filename}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                />
                
                {isDeleting && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              
              {/* Photo Info & Actions */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  {editingIds.has(photo.id) ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingNames[photo.id] || ''}
                        onChange={(e) => setEditingNames(prev => ({ ...prev, [photo.id]: e.target.value }))}
                        className="flex-1 text-sm font-medium bg-transparent border-b focus:outline-none"
                        style={{ borderColor: 'var(--brand)', color: 'var(--text-primary)' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName(photo)
                          if (e.key === 'Escape') handleCancelEdit(photo.id)
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveName(photo)}
                        className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
                        style={{ color: 'var(--accent-green)' }}
                        aria-label="Save"
                        title="Save name"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleCancelEdit(photo.id)}
                        className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        aria-label="Cancel"
                        title="Cancel edit"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-medium text-sm truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                        {photo.original_filename}
                      </h3>
                      <button
                        onClick={() => handleEditName(photo)}
                        className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ml-2"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                        aria-label="Edit filename"
                        title="Edit name"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  <span>{formatFileSize(photo.file_size)}</span>
                  <span>{formatDate(photo.uploaded_at)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(photo)}
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors rounded-md"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-blue)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                    aria-label="Download"
                    title="Download photo"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => handleDelete(photo)}
                    disabled={isDeleting}
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors rounded-md disabled:opacity-30"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => { if (!isDeleting) { e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.background = 'var(--bg-elevated)'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                    aria-label="Delete"
                    title="Delete photo"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 animate-spin border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }}></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Load More Indicator */}
      {loadingMore && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 rounded-full" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}></div>
          <span className="ml-3" style={{ color: 'var(--text-secondary)' }}>Loading more photos...</span>
        </div>
      )}
      
      {!hasMore && photos.length > 0 && (
        <div className="text-center py-8">
          <p style={{ color: 'var(--text-muted)' }}>
            🏁 You&rsquo;ve reached the end! {photos.length} photos total.
          </p>
        </div>
      )}
    </div>
  )
}

export default PhotoGallery
