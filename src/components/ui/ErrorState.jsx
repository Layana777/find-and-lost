import { Button } from './Button'

/**
 * حالة الفشل: رسالة مفهومة وزر إعادة محاولة. لا يُعرض نص الخطأ التقني —
 * `api.js` حوّله مسبقًا إلى عبارة عربية.
 */
export function ErrorState({
  title = 'تعذّر تحميل البيانات',
  error,
  onRetry,
  retryLabel = 'إعادة المحاولة',
}) {
  const message =
    typeof error === 'string'
      ? error
      : error?.message || 'حدث خطأ أثناء الاتصال. حاول مرة أخرى بعد قليل.'

  return (
    <div className="state-block" role="alert">
      <h3 className="state-title">{title}</h3>
      <p className="state-body">{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
