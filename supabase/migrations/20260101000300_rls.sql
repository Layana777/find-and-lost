-- ═══════════════════════════════════════════════════════════════════════════
-- 0004 — دوال الصلاحيات وسياسات RLS
--
-- تجنّب الدوران: أي سياسة تحتاج قراءة جدول محمي تستدعي دالة `security definer`
-- بدل الاستعلام المباشر، فلا تُستدعى سياسة الجدول الآخر من داخل السياسة.
-- كل الدوال تثبّت `search_path` وتُنزع صلاحية التنفيذ عن `public`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── دور المستخدم الحالي ────────────────────────────────────────────────────
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'anon');
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_role() in ('moderator', 'admin');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_role() = 'admin';
$$;

-- ── عضوية المحادثة (يكسر دوران conversations ↔ conversation_members) ───────
create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members m
    where m.conversation_id = p_conversation_id
      and m.user_id = auth.uid()
  );
$$;

-- ── ملكية البلاغ ───────────────────────────────────────────────────────────
create or replace function public.owns_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reports r
    where r.id = p_report_id and r.user_id = auth.uid()
  );
$$;

-- ── هل المستخدم طرف في هذه المطابقة؟ ───────────────────────────────────────
create or replace function public.owns_match(p_lost uuid, p_found uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reports r
    where r.id in (p_lost, p_found) and r.user_id = auth.uid()
  );
$$;

revoke execute on function
  public.current_user_role(), public.is_staff(), public.is_admin(),
  public.is_conversation_member(uuid), public.owns_report(uuid), public.owns_match(uuid, uuid)
from public;

grant execute on function
  public.current_user_role(), public.is_staff(), public.is_admin(),
  public.is_conversation_member(uuid), public.owns_report(uuid), public.owns_match(uuid, uuid)
to authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- تفعيل RLS على كل جدول
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.profiles             enable row level security;
alter table public.profile_contacts     enable row level security;
alter table public.categories           enable row level security;
alter table public.reports              enable row level security;
alter table public.report_images        enable row level security;
alter table public.match_settings       enable row level security;
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;
alter table public.matches              enable row level security;
alter table public.notifications        enable row level security;
alter table public.report_flags         enable row level security;
alter table public.moderation_audit     enable row level security;

-- ── profiles ───────────────────────────────────────────────────────────────
-- عامة القراءة: نحتاج اسم الناشر في صفحة البلاغ. لا تحتوي بيانات اتصال.
drop policy if exists "profiles readable by everyone" on public.profiles;
create policy "profiles readable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "profiles updatable by owner" on public.profiles;
create policy "profiles updatable by owner"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles manageable by admin" on public.profiles;
create policy "profiles manageable by admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- منع تصعيد الصلاحيات: أي محاولة لتغيير `role` من غير مدير تُعاد إلى القيمة
-- السابقة بصمت على مستوى قاعدة البيانات، فلا تنفع الواجهة في تجاوزها.
create or replace function public.tg_profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_role on public.profiles;
create trigger guard_role before update on public.profiles
  for each row execute function public.tg_profiles_guard_role();

-- ── profile_contacts: صاحبها فقط، لا أحد غيره — ولا حتى المشرفون ──────────
drop policy if exists "contacts readable by owner" on public.profile_contacts;
create policy "contacts readable by owner"
  on public.profile_contacts for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "contacts insertable by owner" on public.profile_contacts;
create policy "contacts insertable by owner"
  on public.profile_contacts for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "contacts updatable by owner" on public.profile_contacts;
create policy "contacts updatable by owner"
  on public.profile_contacts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── categories: قراءة عامة، إدارة للمديرين ─────────────────────────────────
drop policy if exists "categories readable by everyone" on public.categories;
create policy "categories readable by everyone"
  on public.categories for select
  using (true);

drop policy if exists "categories writable by staff" on public.categories;
create policy "categories writable by staff"
  on public.categories for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ── reports ────────────────────────────────────────────────────────────────
drop policy if exists "reports readable by everyone" on public.reports;
create policy "reports readable by everyone"
  on public.reports for select
  using (true);

drop policy if exists "reports insertable by owner" on public.reports;
create policy "reports insertable by owner"
  on public.reports for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "reports updatable by owner" on public.reports;
create policy "reports updatable by owner"
  on public.reports for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "reports deletable by owner" on public.reports;
create policy "reports deletable by owner"
  on public.reports for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "reports moderatable by staff" on public.reports;
create policy "reports moderatable by staff"
  on public.reports for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "reports removable by staff" on public.reports;
create policy "reports removable by staff"
  on public.reports for delete
  to authenticated
  using (public.is_staff());

-- ── report_images ──────────────────────────────────────────────────────────
drop policy if exists "report images readable by everyone" on public.report_images;
create policy "report images readable by everyone"
  on public.report_images for select
  using (true);

drop policy if exists "report images writable by report owner" on public.report_images;
create policy "report images writable by report owner"
  on public.report_images for insert
  to authenticated
  with check (public.owns_report(report_id));

drop policy if exists "report images deletable by report owner" on public.report_images;
create policy "report images deletable by report owner"
  on public.report_images for delete
  to authenticated
  using (public.owns_report(report_id) or public.is_staff());

-- ── match_settings: قراءة عامة (الواجهة تعرض الحد والنافذة)، تعديل للمدير ──
drop policy if exists "match settings readable by everyone" on public.match_settings;
create policy "match settings readable by everyone"
  on public.match_settings for select
  using (true);

drop policy if exists "match settings updatable by admin" on public.match_settings;
create policy "match settings updatable by admin"
  on public.match_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── conversations: الأعضاء فقط ─────────────────────────────────────────────
drop policy if exists "conversations readable by members" on public.conversations;
create policy "conversations readable by members"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_member(id));

-- لا إدراج ولا حذف من الواجهة: المحادثات تُنشأ حصريًا عبر start_conversation()
-- حتى لا يُنشئ أحد محادثة ويضيف نفسه إليها.

-- ── conversation_members: الأعضاء يرون بعضهم، ولا أحد يضيف نفسه ────────────
drop policy if exists "members readable by members" on public.conversation_members;
create policy "members readable by members"
  on public.conversation_members for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

-- تحديث last_read_at لصف المستخدم نفسه فقط (لتعليم المحادثة كمقروءة)
drop policy if exists "members update own read state" on public.conversation_members;
create policy "members update own read state"
  on public.conversation_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── messages: الأعضاء فقط، والمرسل هو المستخدم نفسه ───────────────────────
drop policy if exists "messages readable by members" on public.messages;
create policy "messages readable by members"
  on public.messages for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

drop policy if exists "messages insertable by members" on public.messages;
create policy "messages insertable by members"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

-- الرسائل لا تُعدَّل ولا تُحذف: سجل المحادثة ثابت.

-- ── matches: أصحاب البلاغين فقط ────────────────────────────────────────────
drop policy if exists "matches readable by involved owners" on public.matches;
create policy "matches readable by involved owners"
  on public.matches for select
  to authenticated
  using (public.owns_match(lost_report_id, found_report_id) or public.is_staff());

-- التحديث مسموح لأصحاب البلاغين، لكن `score` و`breakdown` والبلاغين أنفسهم
-- محميون بمحفّز أدناه، فلا يمكن التلاعب بالدرجة.
drop policy if exists "matches updatable by involved owners" on public.matches;
create policy "matches updatable by involved owners"
  on public.matches for update
  to authenticated
  using (public.owns_match(lost_report_id, found_report_id))
  with check (public.owns_match(lost_report_id, found_report_id));

-- لا إدراج من الواجهة: المطابقات تُنشئها Edge Function بمفتاح service_role.

create or replace function public.tg_matches_guard_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- service_role يتجاوز RLS ولا يمر بهذا القيد المنطقي؛ أي جلسة مستخدم
  -- عادية لا تستطيع تغيير الدرجة ولا التفصيل ولا طرفَي المطابقة.
  if auth.uid() is not null then
    new.score           := old.score;
    new.breakdown       := old.breakdown;
    new.lost_report_id  := old.lost_report_id;
    new.found_report_id := old.found_report_id;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_match_score on public.matches;
create trigger guard_match_score before update on public.matches
  for each row execute function public.tg_matches_guard_score();

-- ── notifications: صاحبها فقط ──────────────────────────────────────────────
drop policy if exists "notifications readable by owner" on public.notifications;
create policy "notifications readable by owner"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

-- التحديث الوحيد المسموح هو تعليم الإشعار كمقروء
drop policy if exists "notifications updatable by owner" on public.notifications;
create policy "notifications updatable by owner"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifications deletable by owner" on public.notifications;
create policy "notifications deletable by owner"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- لا إدراج من الواجهة: الإشعارات تنشأ من المحفّزات ومن Edge Function.

-- ── report_flags: ينشئها المستخدم، ويقرأها المشرفون ────────────────────────
drop policy if exists "flags readable by staff" on public.report_flags;
create policy "flags readable by staff"
  on public.report_flags for select
  to authenticated
  using (public.is_staff());

drop policy if exists "flags insertable by authenticated" on public.report_flags;
create policy "flags insertable by authenticated"
  on public.report_flags for insert
  to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "flags updatable by staff" on public.report_flags;
create policy "flags updatable by staff"
  on public.report_flags for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ── moderation_audit: المشرفون يقرأون، والكتابة عبر الدوال فقط ────────────
drop policy if exists "audit readable by staff" on public.moderation_audit;
create policy "audit readable by staff"
  on public.moderation_audit for select
  to authenticated
  using (public.is_staff());
