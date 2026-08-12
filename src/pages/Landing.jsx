import { ScreenShell } from '../components/layout/ScreenShell'
import { Button } from '../components/ui/Button'
import { Tag } from '../components/ui/Tag'
import { useMatchSettings } from '../hooks/useReports'
import { formatNumber, formatPercent } from '../lib/format'

const STEPS = [
  { n: 1, title: 'تنشر البلاغ', body: 'نموذج واحد: صورة، فئة، مكان، تاريخ.' },
  { n: 2, title: 'النظام يطابق', body: 'مقارنة الفئة والمكان والتاريخ والوصف.' },
  { n: 3, title: 'يصلك إشعار', body: 'مطابقة محتملة بدرجة ثقة، لك القرار.' },
  { n: 4, title: 'تتسلّم غرضك', body: 'محادثة داخلية، ثم إغلاق البلاغ.' },
]

export default function Landing() {
  const { data: settings } = useMatchSettings()
  const threshold = settings?.threshold ?? 70

  return (
    <ScreenShell>
      <section className="landing-hero">
        <div>
          <Tag tone="accent2">مجتمع الجامعة</Tag>
          <h1 className="landing-title">غرضك المفقود لم يخرج من الحرم الجامعي.</h1>
          <p className="landing-lead">
            سجّل ما فقدته أو ما وجدته في دقائق. النظام يطابق البلاغات تلقائيًا، ويُشعر الطرفين،
            ويفتح محادثة داخلية دون كشف أرقام التواصل.
          </p>
          <div className="row" style={{ marginTop: 32, gap: 12 }}>
            <Button variant="primary" size="lg" to="/reports/new?type=lost">
              فقدت شيئًا
            </Button>
            <Button size="lg" to="/reports/new?type=found">
              وجدت شيئًا
            </Button>
          </div>
        </div>

        <div className="landing-stats">
          <div>
            <div className="numeral landing-stat-value">{formatNumber(412)}</div>
            <div className="stat-label">بلاغًا نُشر هذا الفصل</div>
          </div>
          <div>
            <div
              className="numeral landing-stat-value"
              style={{ color: 'var(--color-accent-700)' }}
            >
              {formatPercent(68)}
            </div>
            <div className="stat-label">من البلاغات وصلت إلى أصحابها</div>
          </div>
          <div>
            <div className="numeral landing-stat-value">{formatNumber(19)} س</div>
            <div className="stat-label">وسيط الزمن حتى أول مطابقة</div>
          </div>
        </div>
      </section>

      <section className="landing-how">
        <h2 className="section-label">كيف يعمل</h2>
        <div className="grid-4">
          {STEPS.map((step) => (
            <div key={step.n}>
              <div className="numeral landing-step-num">{formatNumber(step.n)}</div>
              <div className="landing-step-title">{step.title}</div>
              <p className="small" style={{ color: 'var(--ink-70)' }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-privacy">
        <div>
          <h2 style={{ fontSize: 30, maxWidth: '20ch' }}>لا رقم جوّال معروض للعامة</h2>
          <p style={{ fontSize: 16, maxWidth: '44ch', color: 'var(--ink-75)' }}>
            كل التواصل يجري داخل التطبيق. أنت من يقرّر متى تبدأ المحادثة ومتى تُغلق البلاغ،
            والمحتوى المخالف يُبلَّغ عنه بضغطة واحدة.
          </p>
          <Button variant="primary" to="/auth" style={{ marginTop: 20 }}>
            ابدأ بحساب الجامعة
          </Button>
        </div>
        <ul className="landing-points">
          <li>مطابقة تلقائية عند تجاوز درجة الثقة {formatPercent(threshold)}.</li>
          <li>محادثة فورية بين الطرفين فقط.</li>
          <li>حالة البلاغ تُحدَّث إلى «تم الاسترجاع» بضغطة.</li>
          <li>إشراف على المحتوى وبلاغات الإساءة.</li>
        </ul>
      </section>
    </ScreenShell>
  )
}
