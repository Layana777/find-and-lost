-- ═══════════════════════════════════════════════════════════════════════════
-- 0001 — الامتدادات والدوال المساعدة
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ── updated_at التلقائي ─────────────────────────────────────────────────────
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.tg_set_updated_at is
  'محفّز مشترك يضبط updated_at عند كل تعديل.';
