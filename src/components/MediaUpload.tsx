import { useState } from 'react'
import { supabase } from '../api/supabaseClient'

type Photo = {
  url: string
  caption: string
  order: number
}

type MediaUploadProps = {
  quoteId?: string
  jobId?: string
  videoUrl: string | null
  photos: Photo[]
  onVideoChange: (url: string | null) => void
  onPhotosChange: (photos: Photo[]) => void
  readOnly?: boolean
}

export function MediaUpload({ 
  quoteId, 
  jobId, 
  videoUrl, 
  photos, 
  onVideoChange, 
  onPhotosChange,
  readOnly = false
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Upload video
  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (200 MB max)
    if (file.size > 200 * 1024 * 1024) {
      alert('Video file size must be under 200 MB')
      return
    }

    // Check file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo']
    if (!validTypes.includes(file.type)) {
      alert('Please upload an MP4, MOV, or AVI file')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Delete old video if exists
      if (videoUrl) {
        const oldPath = videoUrl.split('/').pop()
        if (oldPath) {
          await supabase.storage.from('quote-videos').remove([oldPath])
        }
      }

      // Upload new video
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${quoteId || jobId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('quote-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('quote-videos')
        .getPublicUrl(filePath)

      // Update database
      const table = quoteId ? 'quotes' : 'jobs'
      const idField = quoteId ? quoteId : jobId
      await supabase
        .from(table)
        .update({ video_url: publicUrl })
        .eq('id', idField)

      onVideoChange(publicUrl)
      alert('Video uploaded successfully!')
    } catch (error) {
      console.error('Error uploading video:', error)
      alert('Failed to upload video. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // Delete video
  async function deleteVideo() {
    if (!videoUrl) return
    if (!confirm('Delete this video? This cannot be undone.')) return

    try {
      // Delete from storage
      const path = videoUrl.split('/').slice(-2).join('/')
      await supabase.storage.from('quote-videos').remove([path])

      // Update database
      const table = quoteId ? 'quotes' : 'jobs'
      const idField = quoteId ? quoteId : jobId
      await supabase
        .from(table)
        .update({ video_url: null })
        .eq('id', idField)

      onVideoChange(null)
      alert('Video deleted successfully')
    } catch (error) {
      console.error('Error deleting video:', error)
      alert('Failed to delete video')
    }
  }

  // Upload photo
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Check limit
    if (photos.length + files.length > 10) {
      alert('Maximum 10 photos allowed')
      return
    }

    setUploading(true)

    try {
      const newPhotos: Photo[] = []

      for (const file of files) {
        // Check file size (10 MB max per photo)
        if (file.size > 10 * 1024 * 1024) {
          alert(`Photo "${file.name}" is too large (max 10 MB)`)
          continue
        }

        // Check file type
        const validTypes = ['image/jpeg', 'image/png', 'image/heic']
        if (!validTypes.includes(file.type)) {
          alert(`Photo "${file.name}" must be JPG, PNG, or HEIC`)
          continue
        }

        // Upload photo
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${quoteId || jobId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('quote-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('quote-photos')
          .getPublicUrl(filePath)

        newPhotos.push({
          url: publicUrl,
          caption: '',
          order: photos.length + newPhotos.length
        })
      }

      const updatedPhotos = [...photos, ...newPhotos]
      
      // Update database
      const table = quoteId ? 'quotes' : 'jobs'
      const idField = quoteId ? quoteId : jobId
      await supabase
        .from(table)
        .update({ photos: updatedPhotos })
        .eq('id', idField)

      onPhotosChange(updatedPhotos)
      alert(`${newPhotos.length} photo(s) uploaded successfully!`)
    } catch (error) {
      console.error('Error uploading photos:', error)
      alert('Failed to upload photos. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Update photo caption
  async function updatePhotoCaption(index: number, caption: string) {
    const updatedPhotos = photos.map((p, i) => 
      i === index ? { ...p, caption } : p
    )

    // Update database
    const table = quoteId ? 'quotes' : 'jobs'
    const idField = quoteId ? quoteId : jobId
    await supabase
      .from(table)
      .update({ photos: updatedPhotos })
      .eq('id', idField)

    onPhotosChange(updatedPhotos)
  }

  // Delete photo
  async function deletePhoto(index: number) {
    if (!confirm('Delete this photo? This cannot be undone.')) return

    try {
      const photo = photos[index]
      
      // Delete from storage
      const path = photo.url.split('/').slice(-2).join('/')
      await supabase.storage.from('quote-photos').remove([path])

      // Update photos array
      const updatedPhotos = photos
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, order: i }))

      // Update database
      const table = quoteId ? 'quotes' : 'jobs'
      const idField = quoteId ? quoteId : jobId
      await supabase
        .from(table)
        .update({ photos: updatedPhotos })
        .eq('id', idField)

      onPhotosChange(updatedPhotos)
      alert('Photo deleted successfully')
    } catch (error) {
      console.error('Error deleting photo:', error)
      alert('Failed to delete photo')
    }
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
        <h3 className="font-medium text-neutral-900 mb-2">📹 Video & Photo Notes</h3>
        <p className="text-sm text-neutral-600 mb-2">
          Upload a video walkthrough or photos to help your crew understand the job. Videos and photos transfer automatically when the quote converts to a job.
        </p>
        <ul className="text-xs text-neutral-500 space-y-1 list-disc pl-5">
          <li>Video: MP4, MOV, or AVI (max 200 MB, 2-3 minutes at 1080p)</li>
          <li>Photos: JPG, PNG, or HEIC (max 10 photos, 10 MB each)</li>
          <li>Add captions to photos for context</li>
        </ul>
      </div>

      {/* Video Upload */}
      <div>
        <h3 className="font-medium text-neutral-900 mb-3">Video</h3>
        
        {videoUrl ? (
          <div className="space-y-3">
            <video 
              src={videoUrl} 
              controls 
              className="w-full rounded-lg border border-neutral-200"
              style={{ maxHeight: '400px' }}
            />
            {!readOnly && (
              <button
                onClick={deleteVideo}
                className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
              >
                Delete Video
              </button>
            )}
          </div>
        ) : (
          !readOnly && (
            <div>
              <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-40">
                {uploading ? 'Uploading...' : 'Upload Video'}
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo"
                  onChange={handleVideoUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {uploading && (
                <div className="mt-2 text-sm text-neutral-600">
                  Uploading... {uploadProgress}%
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Photo Upload */}
      <div>
        <h3 className="font-medium text-neutral-900 mb-3">Photos ({photos.length}/10)</h3>
        
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {photos.map((photo, index) => (
              <div key={index} className="space-y-2">
                <img 
                  src={photo.url} 
                  alt={photo.caption || `Photo ${index + 1}`}
                  className="w-full rounded-lg border border-neutral-200 object-cover"
                  style={{ height: '200px' }}
                />
                {!readOnly ? (
                  <>
                    <input
                      type="text"
                      value={photo.caption}
                      onChange={(e) => updatePhotoCaption(index, e.target.value)}
                      placeholder="Add caption..."
                      className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded"
                    />
                    <button
                      onClick={() => deletePhoto(index)}
                      className="w-full px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                    >
                      Delete Photo
                    </button>
                  </>
                ) : (
                  photo.caption && (
                    <p className="text-sm text-neutral-600">{photo.caption}</p>
                  )
                )}
              </div>
            ))}
          </div>
        )}
        
        {!readOnly && photos.length < 10 && (
          <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-40">
            {uploading ? 'Uploading...' : 'Add Photos'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/heic"
              multiple
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  )
}
