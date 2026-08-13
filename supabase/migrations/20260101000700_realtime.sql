-- ═══════════════════════════════════════════════════════════════════════════
-- تفعيل البث اللحظي (Realtime)
--
-- بدون إضافة الجداول إلى منشور `supabase_realtime` لا يصل أي حدث إلى العميل:
-- الرسائل لا تظهر إلا بعد تحديث الصفحة، وعدّاد الإشعارات لا يتغيّر، والبلاغ
-- الجديد لا يُضاف إلى القائمة. الاشتراكات في الواجهة (src/lib/api.js) تعتمد
-- على هذا المنشور.
--
-- RLS يظل ساريًا على البث: لا يستقبل المستخدم إلا الصفوف التي تسمح له سياساته
-- بقراءتها، فالمنشور لا يوسّع الصلاحيات.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

-- الإضافة مشروطة حتى تبقى الهجرة قابلة لإعادة التشغيل دون خطأ «عضو مسبقًا»
do $$
declare
  t text;
begin
  foreach t in array array['reports', 'messages', 'notifications', 'matches']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
