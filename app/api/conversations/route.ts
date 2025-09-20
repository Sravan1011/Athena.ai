import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const authResult = await auth()
    const { userId } = authResult
    
    // Check for JWT timing issues and use fallback authentication
    const clerkAuthReason = request.headers.get('x-clerk-auth-reason')
    const cookies = request.headers.get('cookie')
    
    let fallbackUserId = null
    
    // If JWT timing issue or no userId, try to extract user ID from session token in cookies
    if (!userId && (clerkAuthReason === 'session-token-iat-in-the-future' || !userId)) {
      console.log('Conversations GET API: JWT timing issue detected, attempting cookie-based auth fallback')
      
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
              console.log('Conversations GET API: Fallback authentication successful:', fallbackUserId)
              break
            }
          } catch (fallbackError) {
            console.log('Conversations GET API: Fallback authentication attempt failed:', fallbackError)
            continue
          }
        }
      }
    }
    
    const finalUserId = userId || fallbackUserId
    
    if (!finalUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          role,
          content,
          created_at
        )
      `)
      .eq('user_id', finalUserId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    return NextResponse.json(conversations)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await auth()
    const { userId } = authResult
    
    // Check for JWT timing issues and use fallback authentication
    const clerkAuthReason = request.headers.get('x-clerk-auth-reason')
    const cookies = request.headers.get('cookie')
    
    let fallbackUserId = null
    
    // If JWT timing issue or no userId, try to extract user ID from session token in cookies
    if (!userId && (clerkAuthReason === 'session-token-iat-in-the-future' || !userId)) {
      console.log('Conversations API: JWT timing issue detected, attempting cookie-based auth fallback')
      
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
              console.log('Conversations API: Fallback authentication successful:', fallbackUserId)
              break
            }
          } catch (fallbackError) {
            console.log('Conversations API: Fallback authentication attempt failed:', fallbackError)
            continue
          }
        }
      }
    }
    
    const finalUserId = userId || fallbackUserId
    
    if (!finalUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title } = await request.json()

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: finalUserId,
        title: title || 'New Fact Check'
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

