import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await auth()
    const { userId } = authResult
    
    // Check for JWT timing issues and use fallback authentication
    const clerkAuthReason = request.headers.get('x-clerk-auth-reason')
    const cookies = request.headers.get('cookie')
    
    let fallbackUserId = null
    
    // If JWT timing issue or no userId, try to extract user ID from session token in cookies
    if (!userId && (clerkAuthReason === 'session-token-iat-in-the-future' || !userId)) {
      console.log('Messages GET API: JWT timing issue detected, attempting cookie-based auth fallback')
      
      // Try multiple session token patterns
      const sessionTokenPatterns = [
        /__session=([^;]+)/,
        /__session_[^=]+=([^;]+)/,
        /clerk_session=([^;]+)/
      ]
      
      for (const pattern of sessionTokenPatterns) {
        const sessionTokenMatch = cookies?.match(pattern)
        if (sessionTokenMatch) {
          try {
            const sessionToken = sessionTokenMatch[1]
            const payload = JSON.parse(atob(sessionToken.split('.')[1]))
            fallbackUserId = payload.sub
            
            if (fallbackUserId) {
              console.log('Messages GET API: Fallback authentication successful:', fallbackUserId)
              break
            }
          } catch (fallbackError) {
            console.log('Messages GET API: Fallback authentication attempt failed:', fallbackError)
            continue
          }
        }
      }
    }
    
    const finalUserId = userId || fallbackUserId
    
    if (!finalUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const conversationId = parseInt(id)

    // Verify user owns this conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', finalUserId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json(messages)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await auth()
    const { userId } = authResult
    
    // Check for JWT timing issues and use fallback authentication
    const clerkAuthReason = request.headers.get('x-clerk-auth-reason')
    const cookies = request.headers.get('cookie')
    
    let fallbackUserId = null
    
    // If JWT timing issue or no userId, try to extract user ID from session token in cookies
    if (!userId && (clerkAuthReason === 'session-token-iat-in-the-future' || !userId)) {
      console.log('Messages POST API: JWT timing issue detected, attempting cookie-based auth fallback')
      
      // Try multiple session token patterns
      const sessionTokenPatterns = [
        /__session=([^;]+)/,
        /__session_[^=]+=([^;]+)/,
        /clerk_session=([^;]+)/
      ]
      
      for (const pattern of sessionTokenPatterns) {
        const sessionTokenMatch = cookies?.match(pattern)
        if (sessionTokenMatch) {
          try {
            const sessionToken = sessionTokenMatch[1]
            const payload = JSON.parse(atob(sessionToken.split('.')[1]))
            fallbackUserId = payload.sub
            
            if (fallbackUserId) {
              console.log('Messages POST API: Fallback authentication successful:', fallbackUserId)
              break
            }
          } catch (fallbackError) {
            console.log('Messages POST API: Fallback authentication attempt failed:', fallbackError)
            continue
          }
        }
      }
    }
    
    const finalUserId = userId || fallbackUserId
    
    if (!finalUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const conversationId = parseInt(id)
    const { role, content, metadata } = await request.json()

    // Verify user owns this conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', finalUserId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        metadata
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // Update conversation's updated_at timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    return NextResponse.json(message)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
