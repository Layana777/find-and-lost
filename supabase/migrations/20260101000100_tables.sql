-- ═══════════════════════════════════════════════════════════════════════════
-- 0002 — الجداول والقيود
--
-- ملاحظة خصوصية جوهرية: رقم الجوّال والبريد لا يعيشان في `profiles` إطلاقًا.
-- `profiles` جدول عام القراءة (نحتاج اسم الناشر في صفحة البلاغ)، بينما بيانات
-- الاتصال في `profile_contacts` لا يقرأها إلا صاحبها. هذا يجعل إخفاء الجوّال
-- مضمونًا على مستوى قاعدة البيانات لا على مستوى الواجهة.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── الملفات الشخصية (عامة القراءة) ─────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default 'مستخدم',
  avatar_url  text,
  college     text,
  role        text not null default 'user'
                check (role in ('user', 'moderator', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_full_name_len check (char_length(full_name) between 1 and 80)
);

-- ── بيانات الاتصال الخاصة (لا يقرأها إلا صاحبها) ───────────────────────────
create table if not exists public.profile_contacts (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  email       text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profile_contacts_phone_shape
    check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$')
);

-- ── الفئات ─────────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default extensions.gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint categories_name_len check (char_length(name) between 1 and 60)
);

-- ── البلاغات ───────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id           uuid primary key default extensions.gen_random_uuid(),
  ref          bigint generated always as identity,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  category_id  uuid references public.categories (id) on delete set null,
  type         text not null check (type in ('lost', 'found')),
  status       text not null default 'active'
                 check (status in ('active', 'claimed', 'resolved', 'closed')),
  title        text not null,
  description  text not null default '',
  place        text not null default '',
  event_date   date not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint reports_ref_unique unique (ref),
  constraint reports_title_len check (char_length(title) between 3 and 120),
  constraint reports_description_len check (char_length(description) <= 2000),
  constraint reports_place_len check (char_length(place) <= 160)
);

-- لا بلاغ عن حدث في المستقبل ولا أقدم من سنة. لا يمكن التعبير عن هذا بقيد
-- `check` لأن `now()` ليست immutable، فيُفرض بمحفّز.
create or replace function public.tg_reports_validate_event_date()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.event_date > (now() at time zone 'utc')::date then
    raise exception 'تاريخ الحدث لا يمكن أن يكون في المستقبل.'
      using errcode = 'check_violation';
  end if;
  if new.event_date < ((now() at time zone 'utc')::date - 365) then
    raise exception 'تاريخ الحدث أقدم من سنة.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_event_date on public.reports;
create trigger validate_event_date before insert or update of event_date on public.reports
  for each row execute function public.tg_reports_validate_event_date();

-- ── صور البلاغات (المسار فقط، لا بايتات ولا رابط دائم) ─────────────────────
create table if not exists public.report_images (
  id          uuid primary key default extensions.gen_random_uuid(),
  report_id   uuid not null references public.reports (id) on delete cascade,
  file_path   text not null unique,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint report_images_path_shape check (file_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$')
);

-- ── إعدادات المطابقة (صف واحد، تعدّله لوحة الإدارة) ────────────────────────
create table if not exists public.match_settings (
  id                integer primary key default 1 check (id = 1),
  threshold         integer not null default 70 check (threshold between 1 and 100),
  window_days       integer not null default 7  check (window_days between 1 and 90),
  weight_category   integer not null default 30 check (weight_category >= 0),
  weight_place      integer not null default 30 check (weight_place >= 0),
  weight_date       integer not null default 20 check (weight_date >= 0),
  weight_title      integer not null default 10 check (weight_title >= 0),
  weight_description integer not null default 10 check (weight_description >= 0),
  updated_at        timestamptz not null default now(),
  -- مجموع الأوزان يجب أن يساوي ١٠٠ حتى تبقى الدرجة من ١٠٠
  constraint match_settings_weights_sum
    check (weight_category + weight_place + weight_date + weight_title + weight_description = 100)
);

insert into public.match_settings (id) values (1) on conflict (id) do nothing;

-- ── المحادثات ──────────────────────────────────────────────────────────────
-- محادثة واحدة لكل (بلاغ، من بدأ المحادثة). هذا القيد وحده يمنع تكرار
-- المحادثات عند الضغط على «تواصل مع الناشر» أكثر من مرة.
create table if not exists public.conversations (
  id              uuid primary key default extensions.gen_random_uuid(),
  report_id       uuid not null references public.reports (id) on delete cascade,
  initiator_id    uuid not null references public.profiles (id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz,
  constraint conversations_unique_per_initiator unique (report_id, initiator_id)
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ── الرسائل ────────────────────────────────────────────────────────────────
-- client_id يجعل الإرسال المتفائل idempotent: إعادة المحاولة بنفس المعرّف
-- لا تنتج رسالة ثانية.
create table if not exists public.messages (
  id              uuid primary key default extensions.gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  body            text not null,
  client_id       uuid not null,
  created_at      timestamptz not null default now(),
  constraint messages_body_len check (char_length(btrim(body)) between 1 and 2000),
  constraint messages_client_unique unique (conversation_id, client_id)
);

-- ── المطابقات ──────────────────────────────────────────────────────────────
create table if not exists public.matches (
  id               uuid primary key default extensions.gen_random_uuid(),
  lost_report_id   uuid not null references public.reports (id) on delete cascade,
  found_report_id  uuid not null references public.reports (id) on delete cascade,
  score            integer not null check (score between 0 and 100),
  breakdown        jsonb not null default '{}'::jsonb,
  status           text not null default 'suggested'
                     check (status in ('suggested', 'confirmed', 'rejected')),
  conversation_id  uuid references public.conversations (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint matches_pair_unique unique (lost_report_id, found_report_id),
  constraint matches_distinct_reports check (lost_report_id <> found_report_id)
);

-- ── الإشعارات ──────────────────────────────────────────────────────────────
-- dedupe_key يمنع تكرار الإشعار الآلي عند إعادة تشغيل الـ webhook.
create table if not exists public.notifications (
  id          uuid primary key default extensions.gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null
                check (type in ('match_suggested', 'match_confirmed', 'match_rejected',
                                'new_message', 'report_resolved', 'report_closed',
                                'flag_reviewed')),
  title       text not null,
  body        text not null default '',
  link        text not null default '/',
  dedupe_key  text,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  constraint notifications_dedupe_unique unique (user_id, dedupe_key)
);

-- ── الإبلاغ عن المحتوى ─────────────────────────────────────────────────────
create table if not exists public.report_flags (
  id           uuid primary key default extensions.gen_random_uuid(),
  report_id    uuid not null references public.reports (id) on delete cascade,
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reason       text not null check (reason in ('spam', 'fake', 'inappropriate', 'other')),
  details      text not null default '',
  status       text not null default 'pending'
                 check (status in ('pending', 'reviewing', 'resolved')),
  resolved_by  uuid references public.profiles (id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint report_flags_details_len check (char_length(details) <= 1000),
  constraint report_flags_one_per_user unique (report_id, reporter_id)
);

-- ── سجل إجراءات الإشراف ────────────────────────────────────────────────────
create table if not exists public.moderation_audit (
  id          uuid primary key default extensions.gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ── محفّزات updated_at ─────────────────────────────────────────────────────
drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.profile_contacts;
create trigger set_updated_at before update on public.profile_contacts
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.reports;
create trigger set_updated_at before update on public.reports
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.matches;
create trigger set_updated_at before update on public.matches
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.match_settings;
create trigger set_updated_at before update on public.match_settings
  for each row execute function public.tg_set_updated_at();
