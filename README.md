# لقيتها — تطبيق المفقودات والموجودات

تطبيق ويب عربي (RTL) لمجتمع جامعي: ينشر المستخدم بلاغًا عن غرض **مفقود** أو **موجود**،
والنظام يطابق البلاغات تلقائيًا، ويُشعر الطرفين، ويفتح محادثة داخلية **دون كشف أرقام
التواصل**.

بُني على **React 18 + Vite + React Router + TanStack Query + Supabase**، بلغة
**JavaScript/JSX** فقط.

---

## التشغيل السريع

```bash
npm install
npm run dev
```

يعمل التطبيق فورًا على **بيانات تجريبية محلية** إن لم تُضبط مفاتيح Supabase، فتظهر كل
الشاشات بمحتواها الكامل. البيانات تُحفظ في `localStorage`، ويكفي مسح تخزين الموقع
لإعادتها إلى حالتها الأولى.

| الأمر | الوظيفة |
| --- | --- |
| `npm run dev` | خادم التطوير على `http://localhost:5173` |
| `npm run build` | بناء الإنتاج إلى `dist/` |
| `npm run preview` | معاينة ناتج البناء |
| `npm run lint` | فحص ESLint |
| `npm run test` | اختبارات Vitest |

---

## أوضاع التشغيل

| `.env` | السلوك |
| --- | --- |
| بلا مفاتيح | **الوضع التجريبي** — بيانات محلية، كل الشاشات تعمل |
| مفاتيح مضبوطة | **Supabase الحقيقي** — يتطلب تطبيق migrations أولًا |
| `VITE_DEMO_MODE=true` | يجبر الوضع التجريبي حتى مع وجود المفاتيح |

التبديل بين الوضعين لا يحتاج أي تعديل في الكود: طبقة البيانات كلها في
`src/lib/api.js`، وهي التي تختار المسار.

في الوضع التجريبي يدخلك أي بريد وكلمة مرور من ٨ أحرف إلى حساب العرض
(«عبدالله الزهراني»، بدور `admin` حتى تظهر لوحة الإدارة).

---

## إعداد Supabase

### ١) متغيرات البيئة

انسخ `.env.example` إلى `.env` واملأ:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon key>
```

> مفتاح `service_role` **لا يوضع هنا ولا يُقرأ من الواجهة إطلاقًا**. مكانه أسرار
> Edge Functions فقط.

### ٢) تطبيق migrations

الملفات في `supabase/migrations/` مرتبة وقابلة للتطبيق من الصفر على مشروع جديد:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

أو نفّذها بالترتيب من محرّر SQL في لوحة Supabase:

| الملف | المحتوى |
| --- | --- |
| `…000000_extensions_and_helpers.sql` | `pgcrypto`، `pg_trgm`، محفّز `updated_at` |
| `…000100_tables.sql` | الجداول والقيود |
| `…000200_indexes.sql` | الفهارس، ومنها فهارس `gin_trgm_ops` للبحث التقريبي |
| `…000300_rls.sql` | دوال الصلاحيات وسياسات RLS على كل جدول |
| `…000400_functions.sql` | دوال المحادثات والمطابقة والإشراف |
| `…000500_storage.sql` | bucket الصور وسياساته |
| `…000600_seed_categories.sql` | الفئات الأولية |

### ٣) Storage

ينشئ `…000500_storage.sql` الـ bucket تلقائيًا:

- الاسم: `reports`، **خاص** (`public = false`)
- الحد الأقصى للملف: ٥ ميغابايت
- الصيغ: `image/jpeg`، `image/png`، `image/webp`
- المسار: `reports/{report_id}/{uuid}.{ext}`

يُخزَّن **المسار فقط** في `report_images`، وتُنشأ روابط موقّتة (ساعة) عند القراءة.

### ٤) Realtime

من لوحة Supabase → **Database → Replication → `supabase_realtime`**، فعّل النشر على:

```
reports · messages · notifications · matches
```

أو بأمر SQL:

```sql
alter publication supabase_realtime add table public.reports;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.matches;
```

### ٥) نشر Edge Function للمطابقة

```bash
supabase secrets set MATCH_WEBHOOK_SECRET="$(openssl rand -hex 32)"
supabase functions deploy match-report --no-verify-jwt
```

`--no-verify-jwt` ضروري لأن المستدعي هو Database Webhook لا مستخدم مسجّل؛ الحماية
تأتي من `MATCH_WEBHOOK_SECRET` الذي تتحقق منه الوظيفة قبل أي عمل.

`SUPABASE_URL` و`SUPABASE_SERVICE_ROLE_KEY` يحقنهما Supabase تلقائيًا داخل الوظيفة.

### ٦) ضبط Database Webhook

من **Database → Webhooks → Create a new hook**:

| الحقل | القيمة |
| --- | --- |
| Table | `public.reports` |
| Events | `INSERT` فقط |
| Type | HTTP Request |
| Method | `POST` |
| URL | `https://<project-ref>.supabase.co/functions/v1/match-report` |
| HTTP Headers | `x-webhook-secret: <نفس قيمة MATCH_WEBHOOK_SECRET>` |

### ٧) ترقية مستخدم إلى مشرف

لوحة الإدارة `/admin` متاحة لدور `moderator` أو `admin` فقط. الترقية من محرّر SQL
(لا يمكن فعلها من الواجهة — انظر «منع تصعيد الصلاحيات» أدناه):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@university.edu');
```

---

## الأمان والخصوصية

- **RLS مفعّل على كل جدول** بلا استثناء.
- **رقم الجوّال والبريد لا يعيشان في `profiles`.** `profiles` عام القراءة (نحتاج اسم
  الناشر في صفحة البلاغ)، بينما بيانات الاتصال في `profile_contacts` لا يقرأها إلا
  صاحبها — ولا حتى المشرفون. الإخفاء مضمون في قاعدة البيانات لا في الواجهة.
- **المحادثات للأعضاء فقط.** لا يستطيع أحد إدراج نفسه في `conversation_members`:
  المحادثات تُنشأ حصريًا عبر `start_conversation()` و`confirm_match()`.
- **لا يمكن التلاعب بدرجة المطابقة.** محفّز `guard_match_score` يعيد `score` و
  `breakdown` وطرفَي المطابقة إلى قيمها السابقة في أي تحديث من جلسة مستخدم؛ الإدراج
  محصور في `service_role`.
- **منع تصعيد الصلاحيات.** محفّز `guard_role` يتجاهل أي تغيير لـ `profiles.role`
  ما لم يكن الفاعل مديرًا.
- **لا أسرار في الواجهة.** `service_role` لا يظهر في أي ملف من `src/`.
- **تجنّب دوران RLS.** أي سياسة تحتاج جدولًا محميًا تستدعي دالة `security definer`
  بـ `search_path` مثبّت (`is_conversation_member`، `owns_report`، `is_staff` …).

---

## المطابقة الآلية

تُستدعى `match-report` عند إدراج بلاغ جديد. الخوارزمية:

1. تُقارَن بالبلاغات **من النوع المعاكس** فقط (`lost` ↔ `found`).
2. نافذة زمنية **±٧ أيام** على `event_date`.
3. تُستبعد البلاغات غير النشِطة، وبلاغات المستخدم نفسه، والأزواج المطابَقة سابقًا.
4. تُحسب درجة من ١٠٠:

   | العامل | الوزن | كيف تُحسب |
   | --- | ---: | --- |
   | الفئة | ٣٠ | تطابق تام أو صفر |
   | المكان | ٣٠ | `similarity()` من pg_trgm |
   | التاريخ | ٢٠ | تناقص خطي عبر النافذة |
   | العنوان | ١٠ | `similarity()` |
   | الوصف | ١٠ | `similarity()` |

5. عند الدرجة **≥ ٧٠** تُدرج مطابقة `suggested` وإشعار لكل صاحب بلاغ.

**مصدر الإعدادات:** جدول `match_settings` (تعدّله لوحة الإدارة)، ويعود إلى
`supabase/functions/match-report/config.ts` إن تعذّرت قراءته.

**Idempotent:** `matches_pair_unique` على `(lost, found)` و
`notifications_dedupe_unique` على `(user_id, dedupe_key)` يجعلان إعادة تشغيل الـ
webhook لا تنتج مطابقات أو إشعارات مكررة.

الدرجة تُحسب داخل PostgreSQL في `public.match_candidates` (حيث تعيش `pg_trgm`)،
وهناك نسخة مطابقة بالـ JavaScript في `src/lib/matching.js` للوضع التجريبي — وهي
النسخة التي تختبرها وحدات الاختبار.

---

## المسارات

| المسار | الشاشة | الصلاحية |
| --- | --- | --- |
| `/` | الهبوط | عامة |
| `/auth` | الدخول والتسجيل | عامة |
| `/reports` | أحدث البلاغات | عامة |
| `/search` | البحث والفلترة | عامة |
| `/reports/new` | إنشاء بلاغ | تتطلب تسجيل الدخول |
| `/reports/:id` | تفاصيل البلاغ | عامة |
| `/matches/:id` | المطابقة | تتطلب تسجيل الدخول |
| `/chat/:conversationId?` | المحادثات | تتطلب تسجيل الدخول |
| `/notifications` | الإشعارات | تتطلب تسجيل الدخول |
| `/me` | الملف الشخصي | تتطلب تسجيل الدخول |
| `/admin` | لوحة الإدارة | `moderator` أو `admin` |

الحارس الوحيد هو `src/components/ProtectedRoute.jsx`، وكل شاشة محمّلة بـ
`React.lazy` داخل `Suspense`.

---

## الهوية البصرية

منقولة من التصميم المرجعي، وكل الرموز في `src/styles/tokens.css`:

```css
--color-bg:       #f3f2f2;   /* أرضية الصفحة */
--color-surface:  #eae9e9;   /* البطاقات والحقول */
--color-text:     #201e1d;   /* الحبر */
--color-accent:   #0088b0;   /* اللون الأساسي */
--color-accent-2: #d6006c;   /* الثانوي — بحدود */
```

- **Amiri** للعناوين، **Noto Naskh Arabic** للنصوص.
- المستند مضبوط على `<html lang="ar" dir="rtl">`.
- القواعد العامة وأصناف المكوّنات في `src/styles/base.css`؛ لا ألوان خارج الرموز.
- الوسم الثانوي (`#d6006c`) مخصّص لبلاغات **المفقود**، والأساسي لبلاغات **الموجود**.

### الوصول

تباين WCAG AA، أهداف لمس ≥ ٤٤×٤٤ بكسل على الأجهزة اللمسية، تنقل كامل بالكيبورد،
حلقة تركيز عبر `:focus-visible`، حبس التركيز داخل النوافذ الحوارية وإعادته بعد
الإغلاق، معرض صور يعمل بالأسهم، واحترام `prefers-reduced-motion`. لا `alert()`
ولا `confirm()` في أي مكان — كل التأكيدات عبر `Dialog`.

---

## بنية المشروع

```text
src/
  main.jsx · App.jsx
  lib/        supabase.js · api.js · format.js · matching.js · images.js
              validation.js · queryKeys.js · constants.js
              demo/  store.js · seed.js · placeholder.js
  context/    AuthContext.jsx
  hooks/      useReports · useReport · useRealtimeReports · useConversation
              useNotifications · useMatches · useReportFilters
  components/ layout/ · ui/ · reports/ · chat/ · match/ · moderation/
              ProtectedRoute.jsx
  pages/      Landing · Auth · Home · Search · CreateReport · ReportDetail
              Match · Chat · Notifications · Profile · Admin · NotFound
  styles/     tokens.css · base.css
supabase/
  migrations/ …7 ملفات مرتبة
  functions/match-report/  index.ts · config.ts
```

### قواعد إدارة البيانات

- عميل Supabase **واحد** في `src/lib/supabase.js`؛ لا عميل داخل مكوّن أو hook.
- كل الاستعلامات تمر بـ `src/lib/api.js`، وهو الذي يحوّل أخطاء Supabase إلى رسائل
  عربية — فلا يصل نص خطأ تقني إلى المستخدم.
- مفاتيح TanStack Query في `src/lib/queryKeys.js` وحده.
- كل اشتراكات Realtime تُلغى عند إزالة المكوّن.
- منع تكرار الرسائل عبر `client_id`: النسخة المتفائلة تُستبدل بالصف الوارد بدل أن
  تُضاف بجانبه، وإعادة الإرسال بنفس المعرّف لا تنتج رسالة ثانية على الخادم.
- حالة الفلاتر في query parameters، فالرابط قابل للمشاركة وتبقى الفلاتر عند الرجوع.

---

## الاختبارات

```bash
npm run test
```

٨١ اختبارًا تغطي:

- **حماية المسارات** — التحويل، وحالة الاستعادة، وحارس الدور.
- **تحويل فلاتر البحث من وإلى URL** — بما فيه رحلة ذهاب وعودة كاملة.
- **التحقق من نموذج البلاغ والصور** — العنوان والفئة والتاريخ والحجم والصيغة.
- **درجة المطابقة وحدها الأدنى** — الأوزان، النافذة الزمنية، وحدودها.
- **منع تكرار الرسائل والمحادثات والمطابقات والإبلاغات.**
- **الشاشات الرئيسية** — بما فيها التحقق من أن صفحة البلاغ لا تعرض رقم جوّال.

الاختبارات تعمل دائمًا على المخزن التجريبي (`test.env` في `vite.config.js` يفرغ
مفاتيح Supabase)، فلا تلمس مشروعًا حقيقيًا ولا تتغيّر نتائجها بحسب `.env` المحلي.

### التحقق من RLS

بعد تطبيق migrations، نفّذ من محرّر SQL بحسابين مختلفين:

```sql
-- بهوية مستخدم غير عضو في المحادثة: يجب أن يعيد صفرًا
select count(*) from public.messages where conversation_id = '<id>';

-- بهوية مستخدم آخر: يجب أن يفشل
update public.profiles set role = 'admin' where id = auth.uid();

-- بيانات اتصال مستخدم آخر: يجب أن تعيد صفرًا
select count(*) from public.profile_contacts where user_id <> auth.uid();
```
