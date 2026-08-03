-- ──────────────────────────────────────────────────────────────────────────────
-- B2B Real-Time Messaging Tables
-- Run this in Supabase → SQL Editor → New Query
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Conversations (1-to-1 direct messaging between two users)
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

-- 2. Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text             TEXT        NOT NULL CHECK (length(trim(text)) > 0),
  read             BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender        ON public.messages(sender_id);

-- 3. Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;

-- Conversations: participants or authenticated users can view / create / update
DROP POLICY IF EXISTS "Participants can view conversation"         ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversation" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversation"       ON public.conversations;
DROP POLICY IF EXISTS "Allow authenticated users all conversations" ON public.conversations;

CREATE POLICY "Participants can view conversation"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (participant_a = auth.uid() OR participant_b = auth.uid());

CREATE POLICY "Authenticated users can create conversation"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (participant_a = auth.uid() OR participant_b = auth.uid() OR auth.uid() IS NOT NULL);

CREATE POLICY "Participants can update conversation"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (participant_a = auth.uid() OR participant_b = auth.uid());

-- Messages: only participants can see / send / mark read
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Sender can insert message"      ON public.messages;
DROP POLICY IF EXISTS "Recipient can mark read"        ON public.messages;

CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

CREATE POLICY "Sender can insert message"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

CREATE POLICY "Recipient can mark read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

-- 4. Enable Realtime for WebSocket subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 5. Make sure users table is readable for the email lookup flow
DROP POLICY IF EXISTS "Authenticated users can read user profiles" ON public.users;
CREATE POLICY "Authenticated users can read user profiles"
  ON public.users FOR SELECT
  USING (auth.uid() IS NOT NULL);
