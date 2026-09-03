import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')

    if (!file || !userId) {
      return NextResponse.json({ error: 'File and userId are required' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 })
    }

    const fileExt = file.name?.split('.').pop()?.toLowerCase() || 'png'
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload using service role to avatars bucket
    const { data, error } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/png',
        upsert: true,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: publicData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(fileName)

    const avatarUrl = publicData?.publicUrl

    // Update profile in profiles table
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)

    if (profileErr) {
      console.warn('Profile update notice:', profileErr)
    }

    // Also update auth user metadata
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { avatar_url: avatarUrl },
    })

    return NextResponse.json({ success: true, avatarUrl })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Avatar upload failed' }, { status: 500 })
  }
}
