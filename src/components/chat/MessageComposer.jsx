import { useState } from 'react'
import { Button } from '../ui/Button'

/** حقل كتابة الرسالة. Enter يرسل، وShift+Enter يبدأ سطرًا جديدًا. */
export function MessageComposer({ onSend, disabled = false }) {
  const [value, setValue] = useState('')

  function submit(event) {
    event?.preventDefault()
    const body = value.trim()
    if (!body || disabled) return
    onSend(body)
    setValue('')
  }

  return (
    <form className="composer" onSubmit={submit}>
      <label htmlFor="message-body" className="sr-only">
        نص الرسالة
      </label>
      <textarea
        id="message-body"
        className="input composer-input"
        placeholder="اكتب رسالة…"
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) submit(event)
        }}
      />
      <Button variant="primary" type="submit" disabled={disabled || !value.trim()}>
        إرسال
      </Button>
    </form>
  )
}
