# 🚀 Supabase Setup Guide for ClaimAI

## ✅ **Completed Steps:**
- ✅ Installed @supabase/supabase-js package
- ✅ Created lib/supabase.ts configuration file
- ✅ Created API routes for conversations and messages
- ✅ Updated fact-check page with Supabase integration
- ✅ Updated environment example file

## 📋 **Remaining Setup Steps:**

### **Step 4: Set Up Supabase Project**

1. **Go to [supabase.com](https://supabase.com) and create a new project**
2. **Copy your project URL and anon key from Settings → API**
3. **Run this SQL in your Supabase SQL Editor:**

```sql
-- Create conversations table
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for conversations
CREATE POLICY "Users can view their own conversations" ON conversations
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own conversations" ON conversations
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own conversations" ON conversations
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create policies for messages
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()::text
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### **Step 5: Add Environment Variables**

1. **Copy `.env.example` to `.env.local`:**
   ```bash
   cp env.example .env.local
   ```

2. **Update `.env.local` with your Supabase credentials:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

### **Step 6: Test the Implementation**

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Sign in to your app and go to the fact-check page**

3. **Send a few fact-check queries**

4. **Verify that:**
   - Conversations appear in the sidebar
   - You can click on conversations to load them
   - Messages are persisted between sessions
   - New conversations are created automatically

## 🎯 **Features You'll Get:**

- ✅ **Persistent Chat History** tied to user accounts
- ✅ **Conversation Management** (create, load, switch)
- ✅ **Metadata Storage** (fact-check results, confidence scores)
- ✅ **Secure User Isolation** (users only see their own data)
- ✅ **Real-time Updates** when conversations change

## 🔧 **File Structure Created:**

```
lib/
  └── supabase.ts                    # Supabase client configuration
app/api/
  └── conversations/
      ├── route.ts                   # GET/POST conversations
      └── [id]/messages/
          └── route.ts               # GET/POST messages
```

## 🚀 **Ready to Go!**

Once you complete steps 4-6, your ClaimAI will have enterprise-level chat history persistence just like ChatGPT, Claude, and Gemini! 🎉
