-- =========================================================
-- BuySell B2B Real-Time Messaging Setup & Migration Script
-- Run this in Supabase SQL Editor -> New Query
-- =========================================================

-- 1. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  participant_b     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_text TEXT,
  last_message_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_conversation CHECK (participant_a <> participant_b),
  CONSTRAINT unique_conversation_pair UNIQUE (participant_a, participant_b)
);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_a ON public.conversations(participant_a);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_b ON public.conversations(participant_b);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message  ON public.conversations(last_message_at DESC NULLS LAST);

-- 2. MESSAGES TABLE: Add missing columns (if not present)
CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text             TEXT        NOT NULL CHECK (length(trim(text)) > 0),
  read             BOOLEAN     NOT NULL DEFAULT false,
  attachment_url   TEXT,
  attachment_name  TEXT,
  quote_data       JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS attachment_url  TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS quote_data      JSONB;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender        ON public.messages(sender_id);

-- =========================================================
-- 3. CONVERSATIONS TABLE: RLS Policies
-- =========================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Clean slate: drop conflicting policies
DROP POLICY IF EXISTS "Users can view their conversations"         ON public.conversations;
DROP POLICY IF EXISTS "Users can insert their conversations"        ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations"        ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their conversations"        ON public.conversations;
DROP POLICY IF EXISTS "Participants can view conversation"          ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversation" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversation"        ON public.conversations;
DROP POLICY IF EXISTS "Allow authenticated users to view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow authenticated users to insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow authenticated users to update conversations" ON public.conversations;

-- SELECT: see only conversations you participate in
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (auth.uid() = participant_a OR auth.uid() = participant_b);

-- INSERT: create conversations where you are a participant
CREATE POLICY "Users can insert their conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

-- UPDATE: update conversations you participate in
CREATE POLICY "Users can update their conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (auth.uid() = participant_a OR auth.uid() = participant_b)
WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

-- DELETE: delete conversations you participate in
CREATE POLICY "Users can delete their conversations"
ON public.conversations FOR DELETE
TO authenticated
USING (auth.uid() = participant_a OR auth.uid() = participant_b);

-- =========================================================
-- 4. MESSAGES TABLE: RLS Policies
-- =========================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their conversations"   ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages"              ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages"              ON public.messages;
DROP POLICY IF EXISTS "Participants can view messages"                  ON public.messages;
DROP POLICY IF EXISTS "Sender can insert message"                         ON public.messages;
DROP POLICY IF EXISTS "Recipient can mark read"                           ON public.messages;
DROP POLICY IF EXISTS "Allow authenticated users to view messages"        ON public.messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert messages"      ON public.messages;
DROP POLICY IF EXISTS "Allow authenticated users to update messages"      ON public.messages;

-- SELECT: see messages only in conversations you belong to
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
  )
);

-- INSERT: send messages only to conversations you belong to
CREATE POLICY "Users can insert messages in their conversations"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
  )
);

-- UPDATE: update messages in your conversations
CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
  )
);

-- DELETE: only delete your own messages
CREATE POLICY "Users can delete their own messages"
ON public.messages FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- 5. Enable Realtime for WebSocket subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 6. User profile readability for authenticated users
DROP POLICY IF EXISTS "Authenticated users can read user profiles" ON public.users;
CREATE POLICY "Authenticated users can read user profiles"
  ON public.users FOR SELECT
  USING (auth.uid() IS NOT NULL);
