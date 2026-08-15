-- ═══════════════════════════════════════════════════════════════════════════
-- منع تكرار البريد ورقم الجوّال بين المستخدمين
--
-- البريد مضمون التفرّد في `auth.users` أصلًا، لكن `profile_contacts` كان يقبل
-- أن يسجّل مستخدمان الرقم نفسه. هنا نضمن التفرّد على مستوى قاعدة البيانات، لا
-- على مستوى الواجهة، فلا يمكن الالتفاف عليه بأي عميل.
--
-- التفرّد يحتاج صيغة واحدة للرقم: `0501234567` و`+966 50 123 4567` رقم واحد.
-- لذلك يُوحَّد كل رقم إلى E.164 قبل الحفظ عبر `normalize_phone` ومُشغّل جدول،
-- ثم يُبنى الفهرس الفريد على الصيغة الموحّدة.
--
-- ملاحظة: نسخة JavaScript من هذه الدالة في src/lib/identity.js — أي تعديل في
-- قواعد التوحيد يجب أن يطبَّق في الملفين معًا.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.normalize_phone(p_value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  raw    text := btrim(coalesce(p_value, ''));
  digits text;
begin
  if raw = '' then
    return null;
  end if;

  -- توحيد الأرقام العربية‑الهندية والفارسية إلى لاتينية (نظير foldDigits في JS)
  raw := translate(raw, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
  digits := regexp_replace(raw, '\D', '', 'g');
  if digits = '' then
    return null;
  end if;

  if left(raw, 2) = '00' then
    digits := substr(digits, 3);
  elsif left(raw, 1) <> '+' then
    if left(digits, 1) = '0' then
      digits := '966' || ltrim(digits, '0');
    elsif length(digits) <= 9 then
      digits := '966' || digits;
    end if;
  end if;

  if length(digits) < 8 or length(digits) > 15 then
    return null;
  end if;

  return '+' || digits;
end;
$$;

-- ── توحيد الصيغة عند كل كتابة ──────────────────────────────────────────────
create or replace function public.tg_profile_contacts_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone := public.normalize_phone(new.phone);
  new.email := lower(nullif(btrim(new.email), ''));
  return new;
end;
$$;

drop trigger if exists normalize_contacts on public.profile_contacts;
create trigger normalize_contacts before insert or update on public.profile_contacts
  for each row execute function public.tg_profile_contacts_normalize();

-- توحيد الصفوف الموجودة قبل بناء الفهارس الفريدة
update public.profile_contacts
   set phone = public.normalize_phone(phone),
       email = lower(nullif(btrim(email), ''))
 where phone is not null or email is not null;

-- ── الفهارس الفريدة (الضمان الفعلي) ────────────────────────────────────────
-- جزئية: الصفوف بلا بريد أو بلا جوّال لا تتزاحم على قيمة NULL.
create unique index if not exists profile_contacts_email_unique
  on public.profile_contacts (email)
  where email is not null;

create unique index if not exists profile_contacts_phone_unique
  on public.profile_contacts (phone)
  where phone is not null;

-- ── فحص التوفّر قبل التسجيل ────────────────────────────────────────────────
-- الواجهة تنادي هذه الدالة قبل إنشاء الحساب لتعرض رسالة واضحة تحت الحقل بدل
-- خطأ قاعدة بيانات غامض. الفهرس الفريد أعلاه يبقى هو الضمان الأخير.
-- `auth.uid()` يستثني صاحب الصف نفسه، فحفظ المستخدم رقمه دون تغيير لا يُرفض.
create or replace function public.contact_available(p_email text, p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'email_taken', p_email is not null and exists (
      select 1 from public.profile_contacts
       where email = lower(btrim(p_email))
         and user_id is distinct from auth.uid()
    ),
    'phone_taken', public.normalize_phone(p_phone) is not null and exists (
      select 1 from public.profile_contacts
       where phone = public.normalize_phone(p_phone)
         and user_id is distinct from auth.uid()
    )
  );
$$;

revoke execute on function public.contact_available(text, text) from public;
grant execute on function public.contact_available(text, text) to anon, authenticated;

-- ── إنشاء الملف عند التسجيل: توحيد الرقم وإخفاء البريد الداخلي ─────────────
-- حساب الجوّال يُنشأ ببريد داخلي (`…@phone.lageetha.app`) لا معنى له للمستخدم،
-- فلا يُخزَّن في بيانات الاتصال ولا يُعرض في الملف الشخصي.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, college)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'مستخدم'),
    nullif(btrim(new.raw_user_meta_data ->> 'college'), '')
  )
  on conflict (id) do nothing;

  insert into public.profile_contacts (user_id, email, phone)
  values (
    new.id,
    case when new.email like '%@phone.lageetha.app' then null else new.email end,
    public.normalize_phone(new.raw_user_meta_data ->> 'phone')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;
