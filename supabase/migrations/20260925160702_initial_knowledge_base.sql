create schema if not exists extensions;
create extension if not exists vector with schema extensions;
set search_path = public, extensions;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector not null,
  embedding_model text not null,
  embedding_dimension integer not null,
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  source_chunk_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists chunks_document_id_idx on public.document_chunks(document_id);
create index if not exists chunks_user_model_dimension_idx on public.document_chunks(user_id, embedding_model, embedding_dimension);
create index if not exists conversations_user_updated_idx on public.conversations(user_id, updated_at desc);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);

-- Composite ownership keys prevent a user from attaching their rows to another user's parent.
create unique index if not exists documents_id_user_idx on public.documents(id, user_id);
create unique index if not exists conversations_id_user_idx on public.conversations(id, user_id);
alter table public.document_chunks add constraint chunks_owner_parent_fk
  foreign key (document_id, user_id) references public.documents(id, user_id) on delete cascade;
alter table public.messages add constraint messages_owner_parent_fk
  foreign key (conversation_id, user_id) references public.conversations(id, user_id) on delete cascade;

alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "documents_owner_all" on public.documents
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "chunks_owner_all" on public.document_chunks
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "conversations_owner_all" on public.conversations
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "messages_owner_all" on public.messages
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant usage on schema public, extensions to authenticated;
grant select, insert, update, delete on public.documents, public.document_chunks, public.conversations, public.messages to authenticated;

create or replace function public.match_document_chunks(
  query_embedding extensions.vector,
  query_embedding_model text,
  match_count integer default 5
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  content text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with compatible as materialized (
    select c.id, c.document_id, d.title, c.content, c.embedding
    from public.document_chunks c
    join public.documents d on d.id = c.document_id
    where c.user_id = auth.uid()
      and d.user_id = auth.uid()
      and c.embedding_model = query_embedding_model
      and c.embedding_dimension = vector_dims(query_embedding)
  )
  select
    id as chunk_id,
    document_id,
    title as document_title,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from compatible
  order by embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;

revoke all on function public.match_document_chunks(extensions.vector, text, integer) from public;
grant execute on function public.match_document_chunks(extensions.vector, text, integer) to authenticated;

-- A single transaction swaps a complete index; errors roll back deletion and inserts together.
create or replace function public.replace_document_chunks(target_document_id uuid, new_chunks jsonb)
returns void language plpgsql security invoker set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.documents where id = target_document_id and user_id = auth.uid()) then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;
  if jsonb_typeof(new_chunks) is distinct from 'array' or jsonb_array_length(new_chunks) > 100 then
    raise exception 'Invalid chunk batch' using errcode = '22023';
  end if;
  perform 1 from public.documents where id = target_document_id for update;
  delete from public.document_chunks where document_id = target_document_id;
  insert into public.document_chunks (document_id, user_id, chunk_index, content, embedding, embedding_model, embedding_dimension)
  select target_document_id, auth.uid(), (item->>'chunk_index')::integer,
    item->>'content', (item->>'embedding')::extensions.vector,
    item->>'embedding_model', (item->>'embedding_dimension')::integer
  from jsonb_array_elements(new_chunks) as item;
end;
$$;
revoke all on function public.replace_document_chunks(uuid, jsonb) from public;
grant execute on function public.replace_document_chunks(uuid, jsonb) to authenticated;

create or replace function public.update_document_and_chunks(
  target_document_id uuid, new_title text, new_content text, new_tags text[], new_chunks jsonb
)
returns public.documents language plpgsql security invoker set search_path = public as $$
declare result public.documents;
begin
  if nullif(trim(new_content), '') is null then
    raise exception 'Content required' using errcode = '22023';
  end if;
  update public.documents set title = coalesce(new_title, title), content = new_content,
    tags = coalesce(new_tags, tags), updated_at = now()
  where id = target_document_id and user_id = auth.uid() returning * into result;
  if not found then raise exception 'Document not found' using errcode = 'P0002'; end if;
  perform public.replace_document_chunks(target_document_id, new_chunks);
  return result;
end;
$$;
revoke all on function public.update_document_and_chunks(uuid, text, text, text[], jsonb) from public;
grant execute on function public.update_document_and_chunks(uuid, text, text, text[], jsonb) to authenticated;
