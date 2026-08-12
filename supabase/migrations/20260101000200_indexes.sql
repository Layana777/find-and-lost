-- ═══════════════════════════════════════════════════════════════════════════
-- 0003 — الفهارس
-- ═══════════════════════════════════════════════════════════════════════════

-- الاستعلام الأساسي في «الرئيسية» و«البحث»: تصفية بالنوع والحالة، ترتيب بالأحدث
create index if not exists reports_type_status_created_idx
  on public.reports (type, status, created_at desc);
create index if not exists reports_category_idx
  on public.reports (category_id);
create index if not exists reports_user_idx
  on public.reports (user_id, created_at desc);
-- نافذة المطابقة الزمنية ±٧ أيام
create index if not exists reports_event_date_idx
  on public.reports (event_date);
create index if not exists reports_created_idx
  on public.reports (created_at desc);

-- البحث التقريبي (pg_trgm) في العنوان والوصف والمكان
create index if not exists reports_title_trgm_idx
  on public.reports using gin (title extensions.gin_trgm_ops);
create index if not exists reports_description_trgm_idx
  on public.reports using gin (description extensions.gin_trgm_ops);
create index if not exists reports_place_trgm_idx
  on public.reports using gin (place extensions.gin_trgm_ops);

create index if not exists report_images_report_idx
  on public.report_images (report_id, sort_order);

-- المحادثات والرسائل
create index if not exists conversations_report_idx
  on public.conversations (report_id);
create index if not exists conversations_last_message_idx
  on public.conversations (last_message_at desc nulls last);
create index if not exists conversation_members_user_idx
  on public.conversation_members (user_id);
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);
create index if not exists messages_sender_idx
  on public.messages (sender_id);

-- الإشعارات: قائمة المستخدم بالأحدث، وعدّاد غير المقروء
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

-- المطابقات
create index if not exists matches_lost_idx
  on public.matches (lost_report_id, status);
create index if not exists matches_found_idx
  on public.matches (found_report_id, status);

-- الإبلاغات: لوحة الإدارة تفتح على «المعلّقة»
create index if not exists report_flags_status_created_idx
  on public.report_flags (status, created_at desc);
create index if not exists report_flags_report_idx
  on public.report_flags (report_id);

create index if not exists moderation_audit_created_idx
  on public.moderation_audit (created_at desc);
