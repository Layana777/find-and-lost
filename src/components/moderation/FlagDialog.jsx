import { useState } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Input'
import { FLAG_REASONS } from '../../lib/constants'

/** نافذة الإبلاغ عن محتوى مخالف بالأسباب المحددة في المخطط. */
export function FlagDialog({ open, onClose, onSubmit, submitting = false, error }) {
  const [reason, setReason] = useState(FLAG_REASONS[0].value)
  const [details, setDetails] = useState('')

  function handleSubmit() {
    onSubmit({ reason, details: details.trim() })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="إبلاغ عن محتوى مخالف"
      description="اختر السبب. تُراجع الإبلاغات من فريق الإشراف، ولا يُبلَّغ الناشر بهويتك."
      actions={
        <>
          <Button onClick={onClose} disabled={submitting}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            إرسال الإبلاغ
          </Button>
        </>
      }
    >
      <fieldset className="filter-group">
        <legend className="sr-only">سبب الإبلاغ</legend>
        <div className="stack stack-2">
          {FLAG_REASONS.map((option) => (
            <label className="radio" key={option.value}>
              <input
                type="radio"
                name="flag-reason"
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
              />
              <span className="dot" />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Textarea
        label="تفاصيل (اختياري)"
        value={details}
        maxLength={1000}
        style={{ minHeight: 70 }}
        onChange={(event) => setDetails(event.target.value)}
      />

      {error ? (
        <div className="banner-error" role="alert">
          {error}
        </div>
      ) : null}
    </Dialog>
  )
}
