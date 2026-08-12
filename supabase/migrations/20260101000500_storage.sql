-- ═══════════════════════════════════════════════════════════════════════════
-- 0006 — Storage: bucket الصور وسياساته
--
-- مسار الملف: reports/{report_id}/{uuid}.{ext}
-- الجزء الأول من المسار هو معرّف البلاغ، وعليه تُبنى كل سياسات الملكية.
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reports',
  'reports',
  false,                                   -- خاص: القراءة عبر روابط موقّعة
  5 * 1024 * 1024,                         -- ٥ ميغابايت لكل ملف
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- القراءة متاحة للجميع: صور البلاغات محتوى عام، والـ bucket خاص فقط ليمر
-- كل وصول عبر رابط موقّت بدل رابط دائم لا ينتهي.
drop policy if exists "report images are readable" on storage.objects;
create policy "report images are readable"
  on storage.objects for select
  using (bucket_id = 'reports');

-- الرفع داخل مجلد بلاغ يملكه المستخدم فقط
drop policy if exists "report images uploadable by report owner" on storage.objects;
create policy "report images uploadable by report owner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'reports'
    and public.owns_report(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "report images updatable by report owner" on storage.objects;
create policy "report images updatable by report owner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'reports'
    and public.owns_report(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'reports'
    and public.owns_report(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "report images deletable by report owner" on storage.objects;
create policy "report images deletable by report owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'reports'
    and (public.owns_report(((storage.foldername(name))[1])::uuid) or public.is_staff())
  );
