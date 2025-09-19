import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Conversation {
  id: number
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  conversation_id: number
  role: 'user' | 'assistant'
  content: string
  metadata?: {
    fact_check_result?: Record<string, unknown>
    sources?: Record<string, unknown>[]
    confidence_score?: number
  }
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Conversation, 'id' | 'created_at'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'>
        Update: Partial<Omit<Message, 'id' | 'created_at'>>
      }
    }
  }
}
