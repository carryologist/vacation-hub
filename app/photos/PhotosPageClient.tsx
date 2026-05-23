'use client'

import { useState } from 'react'
import PhotoUpload from '../../components/PhotoUpload'
import PhotoGallery from '../../components/PhotoGallery'

interface PhotosPageClientProps {
  tripName: string;
}

export default function PhotosPageClient({ tripName }: PhotosPageClientProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showUpload, setShowUpload] = useState(false)

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
    setShowUpload(false)
  }

  return (
    <div className="container space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="badge badge-primary mb-4">📸 Photo Sharing</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
          {tripName} <span className="text-gradient">Photos</span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Share and browse photos from our trip!
        </p>
      </div>

      {/* Upload Section */}
      <div className="rounded-2xl shadow-lg p-6" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Share Your Photos
          </h2>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="font-medium transition-colors"
            style={{ color: 'var(--brand)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--brand)'; }}
          >
            {showUpload ? 'Hide Upload' : 'Show Upload'}
          </button>
        </div>

        {showUpload && (
          <div className="animate-fade-in">
            <PhotoUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {!showUpload && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📷</div>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Ready to share your photos?
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              style={{ background: 'var(--brand)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--brand)'; }}
            >
              📸 Share Photo
            </button>
          </div>
        )}
      </div>

      {/* Gallery Section */}
      <div className="rounded-2xl shadow-lg p-6" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Photo Gallery
          </h2>
        </div>

        <PhotoGallery refreshTrigger={refreshTrigger} />
      </div>

      {/* Instructions */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          📝 How to Use Photo Sharing
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div>
            <h4 className="font-medium mb-2">📸 Uploading Photos:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Click &ldquo;Share Photo&rdquo; to upload from your device</li>
              <li>Select multiple photos at once</li>
              <li>Drag &amp; drop on desktop for easy upload</li>
              <li>Supports JPG, PNG, GIF up to 10MB each</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">💾 Managing Photos:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Download high-resolution originals anytime</li>
              <li>Delete photos you&rsquo;ve uploaded</li>
              <li>Photos are shared with the entire group</li>
              <li>Infinite scroll loads more photos automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
