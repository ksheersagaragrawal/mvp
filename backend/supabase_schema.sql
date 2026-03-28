-- Run this in Supabase Dashboard → SQL Editor

create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organizer_name text not null,
  stakeholder_emails text[] default '{}',
  status text default 'active' check (status in ('active', 'processing', 'done')),
  daily_room_url text,
  started_at timestamptz default now(),
  ended_at timestamptz
);

create table transcript_chunks (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  speaker_label text,
  text text not null,
  created_at timestamptz default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  question_text text not null,
  answer_text text,
  asked_at timestamptz default now()
);

create table artifacts (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  type text check (type in ('notes', 'action_items', 'recap_video', 'whiteboard_doc', 'email')),
  content text,
  created_at timestamptz default now()
);

create table action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  owner_label text,
  task text not null,
  due_date date,
  status text default 'open' check (status in ('open', 'done'))
);
