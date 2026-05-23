'use client'

import { useState, useEffect } from 'react'

interface Photo {
  id: string
  url: string
  caption: string
  description?: string
}

interface PhotoCarouselProps {
  photos: Photo[]
  className?: string
}

export default function PhotoCarousel({ photos, className = '' }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying || photos.length <= 1) return
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length)
    }, 5000) // Change photo every 5 seconds
    
    return () => clearInterval(interval)
  }, [isAutoPlaying, photos.length])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false) // Stop auto-play when user manually navigates
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
    setIsAutoPlaying(false)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
    setIsAutoPlaying(false)
  }

  const resumeAutoPlay = () => {
    setIsAutoPlaying(true)
  }

  if (photos.length === 0) {
    return (
      <div className={`rounded-xl flex items-center justify-center h-96 ${className}`} style={{ background: 'var(--bg-elevated)' }}>
        <span style={{ color: 'var(--text-muted)' }}>No photos available</span>
      </div>
    )
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Main Photo Display */}
      <div className="relative h-64 sm:h-80 lg:h-[500px] rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <img
          src={photos[currentIndex].url}
          alt={photos[currentIndex].caption}
          className="w-full h-full object-cover transition-opacity duration-500"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
          }}
        />
        
        {/* Photo Counter */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
          {currentIndex + 1} / {photos.length}
        </div>
        
        {/* Auto-play indicator */}
        {isAutoPlaying && (
          <div className="absolute top-4 left-4 bg-orange-500/80 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Auto-play
          </div>
        )}
        
        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 md:bg-black/20 md:hover:bg-black/40 text-white p-3 rounded-full transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100"
          aria-label="Previous photo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 md:bg-black/20 md:hover:bg-black/40 text-white p-3 rounded-full transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100"
          aria-label="Next photo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        {/* Photo Caption Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          <h3 className="text-white font-semibold text-lg mb-1">
            {photos[currentIndex].caption}
          </h3>
          {photos[currentIndex].description && (
            <p className="text-gray-200 text-sm">
              {photos[currentIndex].description}
            </p>
          )}
        </div>
      </div>
      
      {/* Thumbnail Navigation */}
      <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => goToSlide(index)}
            className="flex-shrink-0 w-24 h-18 rounded-lg overflow-hidden border-2 transition-all duration-300"
            style={
              index === currentIndex 
                ? { borderColor: 'var(--brand)', boxShadow: '0 0 0 2px var(--brand-glow)' } 
                : { borderColor: 'var(--border)' }
            }
          >
            <img
              src={photo.url}
              alt={photo.caption}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
              }}
            />
          </button>
        ))}
      </div>
      
      {/* Dot Indicators */}
      <div className="flex justify-center gap-2.5 mt-4">
        {photos.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={`Go to photo ${index + 1}`}
          >
            <span
              className="w-4 h-4 rounded-full transition-all duration-300 block"
              style={
                index === currentIndex 
                  ? { background: 'var(--brand)' } 
                  : { background: 'var(--border)' }
              }
            />
          </button>
        ))}
      </div>
    </div>
  )
}
