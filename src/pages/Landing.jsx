import { ScreenShell } from '../components/layout/ScreenShell'
import { Button } from '../components/ui/Button'
import { Tag } from '../components/ui/Tag'
import { CampusMap } from '../components/map/CampusMap'
import { useMatchSettings } from '../hooks/useReports'
import { formatNumber, formatPercent } from '../lib/format'

const STEPS = [
  { n: 1, title: 'تنشر البلاغ', body: 'نموذج واحد: صورة، فئة، مكان، تاريخ.' },
  { n: 2, title: 'النظام يطابق', body: 'مقارنة الفئة والمكان والتاريخ والوصف.' },
  { n: 3, title: 'يصلك إشعار', body: 'مطابقة محتملة بدرجة ثقة، لك القرار.' },
  { n: 4, title: 'تتسلّم غرضك', body: 'محادثة داخلية، ثم إغلاق البلاغ.' },
]

const FIGURES = [
  { value: formatNumber(412), label: 'بلاغًا نُشر هذا الفصل' },
  { value: formatPercent(68), label: 'من البلاغات وصلت إلى أصحابها', accent: true },
  { value: `${formatNumber(19)} س`, label: 'وسيط الزمن حتى أول مطابقة' },
]

/* مسار توضيحي على المخطّط — يُري ما تصفه الجملة الأولى بدل أن يكتفي بقولها */
const SAMPLE_TRAIL = [
  { place: 'المكتبة المركزية', tone: 'lost', label: 'فُقد هنا' },
  { place: 'الكافتيريا', tone: 'found', label: 'وُجد هنا' },
]

export default function Landing() {
  const { data: settings } = useMatchSettings()
  const threshold = settings?.threshold ?? 70

  return (
    <ScreenShell>
      <section className="landing-hero">
        <Tag tone="accent2" className="landing-kicker">
          مجتمع الجامعة
        </Tag>
        <h1 className="landing-title">غرضك المفقود لم يخرج من الحرم الجامعي.</h1>
        <div className="landing-lead-col">
          <p className="landing-lead">
            سجّل ما فقدته أو ما وجدته في دقائق. النظام يطابق البلاغات تلقائيًا، ويُشعر الطرفين،
            ويفتح محادثة داخلية دون كشف أرقام التواصل.
          </p>
          <div className="landing-cta">
            <Button variant="primary" size="lg" to="/reports/new?type=lost">
              فقدت شيئًا
            </Button>
            <Button size="lg" to="/reports/new?type=found">
              وجدت شيئًا
            </Button>
          </div>
        </div>
      </section>

      {/* المخطّط هو الدليل على الجملة أعلاه، لا زينة تحتها */}
      <section className="landing-visual reveal">
        <CampusMap
          points={SAMPLE_TRAIL}
          connect
          track
          caption="كل بلاغ يظهر على مخطّط الحرم، ويُرسم مسار الغرض من موضع فقده إلى موضع العثور عليه — واختر موقعك لترى كم دقيقة تفصلك عنه."
        />
      </section>

      <section className="landing-figures" aria-label="أرقام هذا الفصل">
        {FIGURES.map((figure) => (
          <div key={figure.label} className="landing-figure">
            <div
              className="numeral landing-figure-value"
              style={figure.accent ? { color: 'var(--color-accent-700)' } : undefined}
            >
              {figure.value}
            </div>
            <div className="stat-label">{figure.label}</div>
          </div>
        ))}
      </section>

      <section className="landing-how">
        <h2 className="section-label">كيف يعمل</h2>
        <ol className="landing-steps">
          {STEPS.map((step) => (
            <li key={step.n} className="landing-step">
              <span className="numeral landing-step-num" aria-hidden="true">
                {formatNumber(step.n)}
              </span>
              <span className="landing-step-title">{step.title}</span>
              <p className="landing-step-body">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-privacy">
        <div>
          <h2 className="landing-privacy-title">الخصوصية والأمان</h2>
          <p className="landing-privacy-body">
            كل التواصل يجري داخل التطبيق. أنت من يقرّر متى تبدأ المحادثة ومتى تُغلق البلاغ，
            ولا يصل أحد إليك خارجه.
          </p>
          <Button variant="primary" to="/auth" style={{ marginTop: 20 }}>
            ابدأ بحساب الجامعة
          </Button>
        </div>
        <ul className="landing-points list-divided">
          <li>مطابقة تلقائية عند تجاوز درجة الثقة {formatPercent(threshold)}.</li>
          <li>محادثة فورية بين الطرفين فقط.</li>
          <li>حالة البلاغ تُحدَّث إلى «تم الاسترجاع» بضغطة.</li>
          <li>لا يُعرض بريدك ولا رقمك في أي شاشة.</li>
        </ul>
      </section>
    </ScreenShell>
  )
}
