-- Run only against the isolated Goodspeed assessment project. The transaction is rolled back.
begin;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'qa-a@example.invalid', '!', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'qa-b@example.invalid', '!', now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
insert into public.documents (id, user_id, title, content)
values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a1', 'A document', 'old');
select public.replace_document_chunks('00000000-0000-4000-8000-0000000000d1',
  '[{"chunk_index":0,"content":"old","embedding":[1,0,0],"embedding_model":"qa","embedding_dimension":3}]'::jsonb);
select (public.update_document_and_chunks('00000000-0000-4000-8000-0000000000d1', 'Updated', 'new', array['qa'],
  '[{"chunk_index":0,"content":"new","embedding":[0,1,0],"embedding_model":"qa","embedding_dimension":3}]'::jsonb)).title;
insert into public.conversations(id, user_id, title)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'Private');
insert into public.messages(user_id, conversation_id, role, content)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000c1', 'user', 'Private question');

do $$ begin
  if (select count(*) from public.document_chunks where content = 'old') <> 0
     or (select count(*) from public.document_chunks where content = 'new') <> 1
     or (select count(*) from public.match_document_chunks('[0,1,0]'::extensions.vector, 'qa', 5)) <> 1 then
    raise exception 'Owner index or retrieval failed';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', true);
do $$ declare affected integer; begin
  if (select count(*) from public.documents) <> 0 or (select count(*) from public.document_chunks) <> 0
     or (select count(*) from public.conversations) <> 0 or (select count(*) from public.messages) <> 0
     or (select count(*) from public.match_document_chunks('[0,1,0]'::extensions.vector, 'qa', 5)) <> 0 then
    raise exception 'Cross-user isolation failed';
  end if;
  update public.documents set title = 'tampered' where id = '00000000-0000-4000-8000-0000000000d1';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user update succeeded'; end if;
  begin
    insert into public.document_chunks(user_id, document_id, chunk_index, content, embedding, embedding_model, embedding_dimension)
    values ('00000000-0000-4000-8000-0000000000b2','00000000-0000-4000-8000-0000000000d1',1,'forged','[1,0,0]','qa',3);
    raise exception 'Cross-user chunk attachment succeeded';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.messages(user_id, conversation_id, role, content)
    values ('00000000-0000-4000-8000-0000000000b2','00000000-0000-4000-8000-0000000000c1','user','forged');
    raise exception 'Cross-user message attachment succeeded';
  exception when foreign_key_violation then null;
  end;
end $$;
rollback;
