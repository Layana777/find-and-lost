import { createClient } from '@supabase/supabase-js'

/**
 * عميل Supabase الوحيد في التطبيق. لا تنشئ عميلًا آخر داخل مكوّن أو hook.
 *
 * التطبيق يعمل قبل ربط Supabase: إن لم تُضبط متغيرات البيئة يبقى العميل `null`
 * وتتحول طبقة البيانات (src/lib/api.js) إلى المخزن التجريبي. بمجرد وضع القيم
 * في `.env` يعمل نفس الكود على قاعدة البيانات الحقيقية دون أي تغيير آخر.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * `VITE_DEMO_MODE=true` يجبر التطبيق على البيانات التجريبية حتى لو كانت
 * مفاتيح Supabase موجودة — مفيد لمعاينة التصميم قبل تطبيق migrations.
 */
const forceDemo = String(import.meta.env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true'

export const isSupabaseConfigured = Boolean(url && anonKey) && !forceDemo

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/** يرمي رسالة عربية مفهومة بدل تسريب نص الخطأ التقني للمستخدم. */
export function assertConfigured() {
  if (!supabase) {
    throw new Error('لم تُضبط بيانات Supabase بعد. التطبيق يعمل الآن على بيانات تجريبية.')
  }
  return supabase
}
