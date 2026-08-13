import { Component } from 'react'
import { ScreenShell } from './layout/ScreenShell'
import { Button } from './ui/Button'

/**
 * حاجز الأخطاء: بدونه أي استثناء أثناء العرض يُفرِغ الصفحة تمامًا (شاشة بيضاء)
 * ولا يرى المستخدم سببًا. هنا نعرض رسالة مفهومة، ونُظهر نص الخطأ التقني في
 * وضع التطوير فقط ليسهل تتبّعه، مع زرّين للخروج من الحالة.
 *
 * مكتوب كمكوّن صنف لأن React لا توفّر مكافئًا خطافيًا لـ componentDidCatch.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // يظهر في وحدة تحكّم المتصفح مع مسار المكوّنات الذي أدّى إلى الخطأ
    console.error('خطأ غير متوقّع أثناء العرض:', error, info?.componentStack)
  }

  componentDidUpdate(previousProps) {
    // الانتقال إلى مسار آخر يعيد المحاولة، فلا يبقى المستخدم حبيس الخطأ
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const body = (
      <div className="state-block" role="alert">
        <h1 className="state-title">تعذّر عرض هذه الصفحة</h1>
        <p className="state-body">
          حدث خطأ غير متوقّع أثناء عرض الصفحة. جرّب تحديثها، وإن تكرّر الخطأ فأبلغ فريق
          الدعم بالرسالة أدناه.
        </p>
        {import.meta.env.DEV ? (
          <pre
            className="small"
            dir="ltr"
            style={{
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              overflowX: 'auto',
              maxHeight: 220,
              margin: '0 0 16px',
            }}
          >
            {error.message}
          </pre>
        ) : null}
        <div className="row row-tight" style={{ justifyContent: 'center' }}>
          <Button variant="primary" onClick={() => window.location.reload()}>
            تحديث الصفحة
          </Button>
          {this.props.plain ? null : <Button to="/reports">العودة إلى البلاغات</Button>}
        </div>
      </div>
    )

    // `plain` للحاجز الأعلى في main.jsx: لا يعتمد على شريط التنقل ولا على سياق
    // الجلسة، فيصمد حتى لو كان الخطأ في المزوّدات نفسها.
    return this.props.plain ? (
      <div className="shell">
        <main className="page page-narrow">{body}</main>
      </div>
    ) : (
      <ScreenShell>{body}</ScreenShell>
    )
  }
}
