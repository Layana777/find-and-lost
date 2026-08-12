-- ═══════════════════════════════════════════════════════════════════════════
-- 0005 — دوال التطبيق: إنشاء الملف، المحادثات، المطابقة، الإشراف
-- ═══════════════════════════════════════════════════════════════════════════

-- ── إنشاء ملف شخصي عند التسجيل ─────────────────────────────────────────────
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
    new.email,
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- المحادثات
-- ═══════════════════════════════════════════════════════════════════════════

-- تفتح محادثة المستخدم الحالي مع ناشر البلاغ، أو تعيد الموجودة.
-- idempotent: النداء المتكرر يعيد نفس المعرّف ولا ينشئ محادثة ثانية.
create or replace function public.start_conversation(p_report_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me      uuid := auth.uid();
  v_owner   uuid;
  v_conv_id uuid;
begin
  if v_me is null then
    raise exception 'يلزم تسجيل الدخول.' using errcode = '42501';
  end if;

  select r.user_id into v_owner from public.reports r where r.id = p_report_id;
  if v_owner is null then
    raise exception 'البلاغ غير موجود.' using errcode = 'no_data_found';
  end if;
  if v_owner = v_me then
    raise exception 'لا يمكن بدء محادثة مع بلاغك أنت.' using errcode = '22023';
  end if;

  insert into public.conversations (report_id, initiator_id)
  values (p_report_id, v_me)
  on conflict (report_id, initiator_id) do nothing
  returning id into v_conv_id;

  if v_conv_id is null then
    select c.id into v_conv_id
    from public.conversations c
    where c.report_id = p_report_id and c.initiator_id = v_me;
  end if;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conv_id, v_me), (v_conv_id, v_owner)
  on conflict (conversation_id, user_id) do nothing;

  return v_conv_id;
end;
$$;

-- ── تحديث آخر رسالة + إشعار الطرف الآخر ────────────────────────────────────
create or replace function public.tg_message_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_name text;
  v_report_title text;
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;

  select p.full_name into v_sender_name
  from public.profiles p where p.id = new.sender_id;

  select r.title into v_report_title
  from public.conversations c
  join public.reports r on r.id = c.report_id
  where c.id = new.conversation_id;

  -- إشعار واحد لكل رسالة لكل عضو آخر. dedupe_key مبني على معرّف الرسالة،
  -- فإعادة الإدراج (لو حدثت) لا تنتج إشعارًا مكررًا.
  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  select
    m.user_id,
    'new_message',
    'رسالة جديدة من ' || coalesce(v_sender_name, 'مستخدم'),
    left(new.body, 120),
    '/chat/' || new.conversation_id::text,
    'msg:' || new.id::text
  from public.conversation_members m
  where m.conversation_id = new.conversation_id
    and m.user_id <> new.sender_id
  on conflict (user_id, dedupe_key) do nothing;

  return new;
end;
$$;

drop trigger if exists message_after_insert on public.messages;
create trigger message_after_insert after insert on public.messages
  for each row execute function public.tg_message_after_insert();

-- ── تعليم المحادثة كمقروءة ─────────────────────────────────────────────────
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.conversation_members
     set last_read_at = now()
   where conversation_id = p_conversation_id
     and user_id = auth.uid();
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- المطابقة
-- ═══════════════════════════════════════════════════════════════════════════

-- تحسب مرشّحي المطابقة لبلاغ واحد. تُستدعى من Edge Function بمفتاح
-- service_role فقط. الأوزان والنافذة تأتي كمعاملات، فالمصدر الوحيد للإعدادات
-- هو config.ts / match_settings لا هذه الدالة.
create or replace function public.match_candidates(
  p_report_id      uuid,
  p_window_days    integer,
  p_w_category     integer,
  p_w_place        integer,
  p_w_date         integer,
  p_w_title        integer,
  p_w_description  integer
)
returns table (
  candidate_id       uuid,
  candidate_user_id  uuid,
  candidate_title    text,
  source_user_id     uuid,
  source_title       text,
  lost_report_id     uuid,
  found_report_id    uuid,
  score              integer,
  breakdown          jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with src as (
    select * from public.reports where id = p_report_id
  )
  select
    c.id,
    c.user_id,
    c.title,
    s.user_id,
    s.title,
    case when s.type = 'lost' then s.id else c.id end,
    case when s.type = 'lost' then c.id else s.id end,
    (comp.cat + comp.plc + comp.dt + comp.ttl + comp.dsc)::integer,
    jsonb_build_object(
      'category',    jsonb_build_object('score', comp.cat, 'weight', p_w_category),
      'place',       jsonb_build_object('score', comp.plc, 'weight', p_w_place),
      'date',        jsonb_build_object('score', comp.dt,  'weight', p_w_date),
      'title',       jsonb_build_object('score', comp.ttl, 'weight', p_w_title),
      'description', jsonb_build_object('score', comp.dsc, 'weight', p_w_description)
    )
  from src s
  join public.reports c
    on c.type = case when s.type = 'lost' then 'found' else 'lost' end
   and c.status = 'active'
   and c.user_id <> s.user_id
   and c.id <> s.id
   and abs(c.event_date - s.event_date) <= p_window_days
  cross join lateral (
    select
      (case when s.category_id is not null and c.category_id = s.category_id
            then p_w_category else 0 end)::integer as cat,
      round(
        extensions.similarity(lower(coalesce(c.place, '')), lower(coalesce(s.place, '')))::numeric
        * p_w_place
      )::integer as plc,
      round(
        (1 - (abs(c.event_date - s.event_date)::numeric / greatest(p_window_days, 1)))
        * p_w_date
      )::integer as dt,
      round(
        extensions.similarity(lower(c.title), lower(s.title))::numeric * p_w_title
      )::integer as ttl,
      round(
        extensions.similarity(lower(coalesce(c.description, '')), lower(coalesce(s.description, '')))::numeric
        * p_w_description
      )::integer as dsc
  ) comp
  where s.status = 'active'
    and not exists (
      select 1 from public.matches m
      where m.lost_report_id  = case when s.type = 'lost' then s.id else c.id end
        and m.found_report_id = case when s.type = 'lost' then c.id else s.id end
    )
  order by 8 desc;
$$;

revoke execute on function public.match_candidates(uuid, integer, integer, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.match_candidates(uuid, integer, integer, integer, integer, integer, integer) to service_role;

-- ── تأكيد المطابقة: يفتح محادثة مرة واحدة ويحوّل البلاغين إلى claimed ──────
create or replace function public.confirm_match(p_match_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me       uuid := auth.uid();
  v_match    public.matches%rowtype;
  v_lost     public.reports%rowtype;
  v_found    public.reports%rowtype;
  v_other    uuid;
  v_conv_id  uuid;
  v_report   uuid;
begin
  if v_me is null then
    raise exception 'يلزم تسجيل الدخول.' using errcode = '42501';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'المطابقة غير موجودة.' using errcode = 'no_data_found';
  end if;

  select * into v_lost  from public.reports where id = v_match.lost_report_id;
  select * into v_found from public.reports where id = v_match.found_report_id;

  if v_me not in (v_lost.user_id, v_found.user_id) then
    raise exception 'لا صلاحية على هذه المطابقة.' using errcode = '42501';
  end if;

  -- idempotent: تأكيد مؤكَّد مسبقًا يعيد نفس المحادثة دون آثار جانبية
  if v_match.status = 'confirmed' and v_match.conversation_id is not null then
    return v_match.conversation_id;
  end if;

  v_other  := case when v_me = v_lost.user_id then v_found.user_id else v_lost.user_id end;
  v_report := case when v_me = v_lost.user_id then v_found.id else v_lost.id end;

  insert into public.conversations (report_id, initiator_id)
  values (v_report, v_me)
  on conflict (report_id, initiator_id) do nothing
  returning id into v_conv_id;

  if v_conv_id is null then
    select c.id into v_conv_id
    from public.conversations c
    where c.report_id = v_report and c.initiator_id = v_me;
  end if;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conv_id, v_me), (v_conv_id, v_other)
  on conflict (conversation_id, user_id) do nothing;

  update public.matches
     set status = 'confirmed', conversation_id = v_conv_id
   where id = p_match_id;

  update public.reports
     set status = 'claimed'
   where id in (v_lost.id, v_found.id)
     and status = 'active';

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  values (
    v_other,
    'match_confirmed',
    'تم تأكيد مطابقة بلاغك',
    'الطرف الآخر أكّد أن الغرض غرضه، وفُتحت محادثة بينكما.',
    '/chat/' || v_conv_id::text,
    'match_confirmed:' || p_match_id::text
  )
  on conflict (user_id, dedupe_key) do nothing;

  return v_conv_id;
end;
$$;

-- ── رفض المطابقة ───────────────────────────────────────────────────────────
create or replace function public.reject_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me    uuid := auth.uid();
  v_match public.matches%rowtype;
begin
  if v_me is null then
    raise exception 'يلزم تسجيل الدخول.' using errcode = '42501';
  end if;

  select * into v_match from public.matches where id = p_match_id;
  if not found then
    raise exception 'المطابقة غير موجودة.' using errcode = 'no_data_found';
  end if;

  if not exists (
    select 1 from public.reports r
    where r.id in (v_match.lost_report_id, v_match.found_report_id)
      and r.user_id = v_me
  ) then
    raise exception 'لا صلاحية على هذه المطابقة.' using errcode = '42501';
  end if;

  update public.matches set status = 'rejected' where id = p_match_id;
end;
$$;

-- ── «تم الاسترجاع»: يحوّل بلاغ المحادثة (وبلاغ المطابقة المرتبط) إلى resolved
--     داخل معاملة واحدة ─────────────────────────────────────────────────────
create or replace function public.resolve_conversation(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me        uuid := auth.uid();
  v_report_id uuid;
begin
  if v_me is null then
    raise exception 'يلزم تسجيل الدخول.' using errcode = '42501';
  end if;
  if not public.is_conversation_member(p_conversation_id) then
    raise exception 'لست عضوًا في هذه المحادثة.' using errcode = '42501';
  end if;

  select c.report_id into v_report_id
  from public.conversations c where c.id = p_conversation_id;

  -- البلاغ المرتبط بالمحادثة + أي بلاغ آخر في مطابقة مؤكَّدة معه
  update public.reports
     set status = 'resolved'
   where status in ('active', 'claimed')
     and id in (
       select v_report_id
       union
       select case when m.lost_report_id = v_report_id then m.found_report_id
                   else m.lost_report_id end
       from public.matches m
       where m.status = 'confirmed'
         and v_report_id in (m.lost_report_id, m.found_report_id)
     );

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  select
    m.user_id,
    'report_resolved',
    'تم إغلاق البلاغ',
    'حُدِّثت حالة البلاغ إلى «تم الاسترجاع».',
    '/reports/' || v_report_id::text,
    'resolved:' || v_report_id::text || ':' || m.user_id::text
  from public.conversation_members m
  where m.conversation_id = p_conversation_id
  on conflict (user_id, dedupe_key) do nothing;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- الإشراف
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.moderate_flag(
  p_flag_id uuid,
  p_action  text  -- 'keep' | 'close_report' | 'delete_report'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me   uuid := auth.uid();
  v_flag public.report_flags%rowtype;
begin
  if not public.is_staff() then
    raise exception 'هذه الصفحة للمشرفين فقط.' using errcode = '42501';
  end if;
  if p_action not in ('keep', 'close_report', 'delete_report') then
    raise exception 'إجراء غير معروف.' using errcode = '22023';
  end if;

  select * into v_flag from public.report_flags where id = p_flag_id;
  if not found then
    raise exception 'الإبلاغ غير موجود.' using errcode = 'no_data_found';
  end if;

  if p_action = 'close_report' then
    update public.reports set status = 'closed' where id = v_flag.report_id;
  elsif p_action = 'delete_report' then
    delete from public.reports where id = v_flag.report_id;
  end if;

  -- عند حذف البلاغ يزول صف الإبلاغ بالتتالي، فلا معنى لتحديثه
  if p_action <> 'delete_report' then
    update public.report_flags
       set status = 'resolved', resolved_by = v_me, resolved_at = now()
     where id = p_flag_id;
  end if;

  insert into public.moderation_audit (actor_id, action, target_type, target_id, meta)
  values (v_me, p_action, 'report_flag', p_flag_id,
          jsonb_build_object('report_id', v_flag.report_id, 'reason', v_flag.reason));
end;
$$;

revoke execute on function
  public.start_conversation(uuid), public.confirm_match(uuid), public.reject_match(uuid),
  public.resolve_conversation(uuid), public.moderate_flag(uuid, text),
  public.mark_conversation_read(uuid)
from public, anon;

grant execute on function
  public.start_conversation(uuid), public.confirm_match(uuid), public.reject_match(uuid),
  public.resolve_conversation(uuid), public.moderate_flag(uuid, text),
  public.mark_conversation_read(uuid)
to authenticated;
