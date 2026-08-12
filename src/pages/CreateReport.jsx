import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ScreenShell } from '../components/layout/ScreenShell'
import { Seg } from '../components/ui/Seg'
import { Input, Textarea } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'
import { ImageUploader } from '../components/reports/ImageUploader'
import { useCategories, useCreateReport, useMatchSettings } from '../hooks/useReports'
import { validateReport, hasErrors } from '../lib/validation'
import { formatNumber, formatPercent } from '../lib/format'

const TIPS = [
  'صورة واضحة بخلفية بسيطة.',
  'مكان محدد: المبنى ورقم القاعة.',
  'تفصيل يعرفه المالك وحده — يساعد في التحقق.',
]

const today = () => new Date().toISOString().slice(0, 10)

export default function CreateReport() {
  const [searchParams] = useSearchParams()
  const initialType = searchParams.get('type') === 'found' ? 'found' : 'lost'

  const [form, setForm] = useState({
    type: initialType,
    title: '',
    category_id: '',
    event_date: today(),
    place: '',
    description: '',
  })
  const [images, setImages] = useState([])
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)

  const { data: categories = [], isPending: categoriesPending } = useCategories()
  const { data: settings } = useMatchSettings()
  const createReport = useCreateReport()
  const navigate = useNavigate()

  const set = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError(null)

    const nextErrors = validateReport(form)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      document.querySelector('[aria-invalid="true"]')?.focus()
      return
    }

    try {
      const report = await createReport.mutateAsync({ input: form, images })
      navigate(`/reports/${report.id}`, { replace: true })
    } catch (error) {
      setSubmitError(error.message)
    }
  }

  return (
    <ScreenShell>
      <div className="split-create">
        <div>
          <h1 style={{ fontSize: 36, marginBottom: 8 }}>بلاغ جديد</h1>
          <p className="small" style={{ color: 'var(--ink-66)' }}>
            خطوة واحدة. الصورة أولًا، ثم التفاصيل.
          </p>

          <Seg
            name="rtype"
            size="lg"
            ariaLabel="نوع البلاغ"
            value={form.type}
            onChange={set('type')}
            className="create-seg"
            options={[
              { value: 'lost', label: 'فقدت غرضًا' },
              { value: 'found', label: 'وجدت غرضًا' },
            ]}
          />

          <form className="create-form" onSubmit={handleSubmit} noValidate>
            <ImageUploader
              images={images}
              onChange={setImages}
              disabled={createReport.isPending}
            />

            <Input
              label="عنوان البلاغ"
              required
              placeholder="سماعات لاسلكية بيضاء في علبة"
              value={form.title}
              onChange={set('title')}
              error={errors.title}
              maxLength={120}
            />

            <div className="create-pair">
              <Select
                label="الفئة"
                required
                value={form.category_id}
                onChange={set('category_id')}
                error={errors.category_id}
                placeholder={categoriesPending ? 'جارٍ التحميل…' : 'اختر الفئة'}
                disabled={categoriesPending}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Input
                label="تاريخ الحدث"
                type="date"
                required
                max={today()}
                value={form.event_date}
                onChange={set('event_date')}
                error={errors.event_date}
              />
            </div>

            <Input
              label="المكان"
              required
              placeholder="مبنى ٤ — قاعة ٢٠٣"
              value={form.place}
              onChange={set('place')}
              error={errors.place}
              maxLength={160}
            />

            <Textarea
              label="الوصف"
              placeholder="علامات مميزة، اللون، ما كان داخل الحافظة…"
              value={form.description}
              onChange={set('description')}
              error={errors.description}
              maxLength={2000}
            />

            {submitError ? (
              <div className="banner-error" role="alert">
                {submitError}
              </div>
            ) : null}

            <div className="row" style={{ gap: 12, marginTop: 6 }}>
              <Button
                variant="primary"
                type="submit"
                loading={createReport.isPending}
                style={{ padding: '11px 26px' }}
              >
                نشر البلاغ
              </Button>
              <Button onClick={() => navigate('/reports')} disabled={createReport.isPending}>
                إلغاء
              </Button>
            </div>
          </form>
        </div>

        <aside className="create-aside">
          <div>
            <h2 className="section-label">يرفع فرصة الاسترجاع</h2>
            <div className="stack stack-2 small" style={{ color: 'var(--ink-75)' }}>
              {TIPS.map((tip) => (
                <div key={tip}>{tip}</div>
              ))}
            </div>
          </div>

          <div className="callout">
            <div className="callout-title">المطابقة تعمل تلقائيًا</div>
            <p>
              بعد النشر يقارن النظام بلاغك ببلاغات آخر {formatNumber(settings?.window_days ?? 7)}{' '}
              أيام. عند تجاوز {formatPercent(settings?.threshold ?? 70)} يصلك إشعار بالمطابقة.
            </p>
          </div>
        </aside>
      </div>
    </ScreenShell>
  )
}
