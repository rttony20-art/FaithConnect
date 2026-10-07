-- FaithConnect private messages (server-backed, so they reach the other person
-- even when they are not looking at the chat). Safe to run more than once.

create table if not exists public.private_messages (
  id           text primary key,
  convo_id     text not null,
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type         text not null default 'text' check (type in ('text', 'voice')),
  body         text,
  audio        text,
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);
create index if not exists private_messages_convo_idx
  on public.private_messages (convo_id, created_at);
create index if not exists private_messages_unread_idx
  on public.private_messages (recipient_id, read_at);

-- "Delete conversation" hides old messages for ONE person only.
create table if not exists public.conversation_clears (
  user_id    uuid not null references auth.users(id) on delete cascade,
  convo_id   text not null,
  cleared_at timestamptz not null default now(),
  primary key (user_id, convo_id)
);

alter table public.private_messages  enable row level security;
alter table public.conversation_clears enable row level security;

-- Only the two people in a conversation can see its messages.
drop policy if exists pm_select on public.private_messages;
create policy pm_select on public.private_messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists pm_insert on public.private_messages;
create policy pm_insert on public.private_messages for insert to authenticated
  with check (sender_id = auth.uid() and sender_id <> recipient_id);

-- The receiver may mark messages read (and nothing else, see the grant below).
drop policy if exists pm_update on public.private_messages;
create policy pm_update on public.private_messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- You can delete (unsend) only your own messages.
drop policy if exists pm_delete on public.private_messages;
create policy pm_delete on public.private_messages for delete to authenticated
  using (sender_id = auth.uid());

revoke update on public.private_messages from authenticated, anon;
grant  update (read_at) on public.private_messages to authenticated;

drop policy if exists cc_select on public.conversation_clears;
create policy cc_select on public.conversation_clears for select to authenticated
  using (user_id = auth.uid());
drop policy if exists cc_insert on public.conversation_clears;
create policy cc_insert on public.conversation_clears for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists cc_update on public.conversation_clears;
create policy cc_update on public.conversation_clears for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Instant delivery: lets the app hear about new messages in real time.
do $$
begin
  alter publication supabase_realtime add table public.private_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
