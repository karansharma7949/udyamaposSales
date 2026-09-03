import { createClient } from '@/lib/supabase/client'

/**
 * Service for handling Supabase Storage operations (Avatar uploads, etc.)
 */
export const storageService = {
  /**
   * Upload an avatar image file to the public 'avatars' bucket
   * @param {File} file - The image file to upload
   * @param {string} userId - User ID for unique file naming
   * @returns {Promise<string>} Public URL of the uploaded image
   */
  async uploadAvatar(file, userId) {
    const supabase = createClient()

    if (!file) throw new Error('No file provided')
    if (file.size > 5 * 1024 * 1024) throw new Error('File size exceeds 5MB limit')

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    // Upload file
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      // Fallback: If client upload hit RLS, upload via API route
      return this.uploadAvatarViaApi(file, userId)
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    const avatarUrl = publicUrlData?.publicUrl

    // Update profile in database
    if (avatarUrl) {
      await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)
    }

    return avatarUrl
  },

  /**
   * Server API fallback for avatar upload using service role
   */
  async uploadAvatarViaApi(file, userId) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId)

    const res = await fetch('/api/profile/upload-avatar', {
      method: 'POST',
      body: formData,
    })

    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to upload avatar')
    return json.avatarUrl
  },
}
