-- Private file storage for Chronos tasks and sticky notes.
-- Apply this migration in the Supabase SQL Editor for the Chronos project.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chronos-attachments','chronos-attachments',false,10485760,array['image/jpeg','image/png','image/gif','image/webp','image/avif','image/heic','image/bmp','image/tiff','application/pdf'])
on conflict (id) do update set name=excluded.name, public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='chronos_attachments_select_own') then
    create policy chronos_attachments_select_own on storage.objects for select to authenticated using (bucket_id='chronos-attachments' and (storage.foldername(name))[1]=auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='chronos_attachments_insert_own') then
    create policy chronos_attachments_insert_own on storage.objects for insert to authenticated with check (bucket_id='chronos-attachments' and (storage.foldername(name))[1]=auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='chronos_attachments_delete_own') then
    create policy chronos_attachments_delete_own on storage.objects for delete to authenticated using (bucket_id='chronos-attachments' and (storage.foldername(name))[1]=auth.uid()::text);
  end if;
end
$$;
