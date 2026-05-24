'use client'

import { useState, useRef } from 'react'
import { upload } from '@vercel/blob/client'

interface PhotoUploadProps {
  onUploadSuccess: () => void
}

interface UploadProgress {
  filename: string
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
}

const PhotoUpload = ({ onUploadSuccess }: PhotoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    const fileArray = Array.from(files)
    
    // Initialize progress tracking
    const initialProgress = fileArray.map(file => ({
      filename: file.name,
      progress: 0,
      status: 'uploading' as const
    }))
    setUploadProgress(initialProgress)

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        await uploadSingleFile(file, i)
      }
    } catch (error) {
      console.error('Upload failed:')
    } finally {
      setIsUploading(false)
      // Refresh gallery (some uploads may have succeeded)
      onUploadSuccess()
      // Clear progress after delay so user can read any errors
      setTimeout(() => {
        setUploadProgress([])
      }, 5000)
    }
  }

  const uploadSingleFile = async (file: File, index: number) => {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        updateProgress(index, 0, 'error', 'File must be an image')
        return
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        updateProgress(index, 0, 'error', 'File too large (max 10MB)')
        return
      }

      updateProgress(index, 20, 'uploading')

      // Step 1: Upload directly to Vercel Blob (bypasses serverless 4.5MB limit)
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/photos/upload/',
      })

      updateProgress(index, 70, 'processing')

      // Step 2: Save metadata to Postgres
      const response = await fetch('/api/photos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: blob.pathname.split('/').pop() || blob.pathname,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          public_url: blob.url,
          storage_path: blob.pathname,
          uploaded_by: 'Anonymous',
        }),
      })

      if (!response.ok) {
        let errorMsg = `Failed to save photo (HTTP ${response.status})`
        try {
          const errorData = await response.json()
          errorMsg = errorData.error || errorMsg
        } catch {
          // not JSON
        }
        updateProgress(index, 0, 'error', errorMsg)
        return
      }

      updateProgress(index, 100, 'complete')

    } catch (error) {
      console.error('Upload error:')
      const msg = error instanceof Error ? error.message : 'Upload failed'
      updateProgress(index, 0, 'error', msg)
    }
  }

  const updateProgress = (index: number, progress: number, status: UploadProgress['status'], error?: string) => {
    setUploadProgress(prev => prev.map((item, i) => 
      i === index ? { ...item, progress, status, error } : item
    ))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <button
        onClick={handleFileSelect}
        disabled={isUploading}
        className="w-full text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        style={{ 
          background: isUploading ? 'var(--text-muted)' : 'var(--brand)',
          cursor: isUploading ? 'not-allowed' : 'pointer'
        }}
        onMouseEnter={(e) => { if (!isUploading) e.currentTarget.style.background = 'var(--brand-hover)'; }}
        onMouseLeave={(e) => { if (!isUploading) e.currentTarget.style.background = 'var(--brand)'; }}
      >
        {isUploading ? '📤 Uploading...' : '📷 Share Photo'}
      </button>

      {/* Drag & Drop Area (Desktop) */}
      <div
        className="hidden sm:block border-2 border-dashed rounded-lg p-8 text-center transition-colors"
        style={
          dragActive 
            ? { borderColor: 'var(--brand)', background: 'var(--brand-light)' } 
            : { borderColor: 'var(--border)' }
        }
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-4xl mb-2">📸</div>
        <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
          Drag & drop photos here, or click the button above
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Supports JPG, PNG, GIF up to 10MB
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Upload Progress</h3>
          {uploadProgress.map((item, index) => (
            <div key={index} className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                  {item.filename}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {item.status === 'complete' ? '✅' : 
                   item.status === 'error' ? '❌' : 
                   item.status === 'processing' ? '⚙️' : '📤'}
                </span>
              </div>
              
              {item.status !== 'error' && (
                <div className="w-full rounded-full h-2" style={{ background: 'var(--border)' }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${item.progress}%`, background: 'linear-gradient(to right, var(--brand), var(--accent-red))' }}
                  />
                </div>
              )}
              
              {item.error && (
                <p className="text-sm mt-1" style={{ color: 'var(--accent-red)' }}>
                  {item.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PhotoUpload
