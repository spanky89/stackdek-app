begin;

drop policy if exists job_receipts_delete_own on storage.objects;

create policy job_receipts_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'job-receipts'
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[3] = auth.uid()::text
);

commit;
