-- ═══════════════════════════════════════════════════════════════════════════
-- إنشاء الملف الشخصي من التطبيق بدل مُشغِّل على auth.users
--
-- كان الملف يُنشأ بمُشغِّل `on_auth_user_created` على `auth.users`، وحُذف بطلب
-- صاحبة المشروع. النتيجة أن كل مستخدم جديد يبقى بلا صف في `profiles`، وبما أن
-- `reports.user_id` و`conversation_members.user_id` وغيرها تشير إلى `profiles`
-- فإن الحساب يصبح عاجزًا عن نشر بلاغ أو فتح محادثة.
--
-- البديل هنا: دالة يناديها التطبيق بنفسه بعد التسجيل (وعند أول دخول لأي حساب
-- قديم بلا ملف). مزيتان على المُشغِّل:
--   • لا نلمس جدول `auth.users` إطلاقًا.
--   • فشل إنشاء الملف لا يُفشل التسجيل برسالة «Database error saving new user»
--     غامضة، بل يعيد نتيجة يفهمها التطبيق ويعرضها بالعربية.
-- ═══════════════════════════════════════════════════════════════════════════

-- المُشغِّل المحذوف لا يُعاد؛ نُثبّت غيابه حتى لا يعيده تشغيل الهجرات من الصفر
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

/**
 * تُنشئ ملف المستخدم الحالي وبيانات اتصاله إن لم تكن موجودة.
 * آمنة للتكرار: نداؤها مرارًا لا يغيّر شيئًا بعد أول مرة.
 *
 * تعيد `{ "created": bool, "phone_conflict": bool }`.
 * `phone_conflict` يعني أن الرقم مسجّل في حساب آخر، فأُنشئ الملف بلا رقم بدل
 * أن يبقى الحساب معطّلًا — والتطبيق يخبر المستخدم بذلك.
 */
create or replace function public.ensure_profile(
  p_full_name text default null,
  p_college   text default null,
  p_phone     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_email    text;
  v_meta     jsonb;
  v_phone    text;
  v_created  boolean := false;
  v_conflict boolean := false;
begin
  if v_user is null then
    raise exception 'يجب تسجيل الدخول أولًا.' using errcode = '28000';
  end if;

  select u.email, u.raw_user_meta_data into v_email, v_meta
    from auth.users u where u.id = v_user;

  -- بيانات النداء أولًا، ثم ما حُفظ في بيانات المستخدم وقت التسجيل
  insert into public.profiles (id, full_name, college)
  values (
    v_user,
    coalesce(
      nullif(btrim(p_full_name), ''),
      nullif(btrim(v_meta ->> 'full_name'), ''),
      'مستخدم'
    ),
    coalesce(nullif(btrim(p_college), ''), nullif(btrim(v_meta ->> 'college'), ''))
  )
  on conflict (id) do nothing;

  v_created := found;

  -- البريد الداخلي لحسابات الجوّال لا يُخزَّن (انظر src/lib/identity.js)
  v_phone := public.normalize_phone(
    coalesce(nullif(btrim(p_phone), ''), v_meta ->> 'phone')
  );

  begin
    insert into public.profile_contacts (user_id, email, phone)
    values (
      v_user,
      case when v_email like '%@phone.lageetha.app' then null else v_email end,
      v_phone
    )
    on conflict (user_id) do nothing;
  exception when unique_violation then
    v_conflict := true;
    insert into public.profile_contacts (user_id, email, phone)
    values (
      v_user,
      case when v_email like '%@phone.lageetha.app' then null else v_email end,
      null
    )
    on conflict (user_id) do nothing;
  end;

  return jsonb_build_object('created', v_created, 'phone_conflict', v_conflict);
end;
$$;

revoke execute on function public.ensure_profile(text, text, text) from public, anon;
grant execute on function public.ensure_profile(text, text, text) to authenticated;

-- ── استعادة سياسات التخزين المحذوفة (نسخة طبق الأصل من هجرة 0006) ──────────
-- بدونها يفشل رفع صور البلاغات وإنشاء الروابط الموقّعة لعرضها.
drop policy if exists "report images are readable" on storage.objects;
create policy "report images are readable"
  on storage.objects for select
  using (bucket_id = 'reports');

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
