import { useId } from 'react'

/**
 * حقل نصي مع label مرتبط وخطأ مُعلن. أي حقل في التطبيق يمر من هنا حتى لا
 * يوجد حقل بلا label.
 */
export function Input({
  label,
  error,
  hint,
  as = 'input',
  id: providedId,
  className = '',
  required = false,
  ...rest
}) {
  const generatedId = useId()
  const id = providedId || generatedId
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const Tag = as

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <div className="field">
      {label ? (
        <label htmlFor={id}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
      ) : null}
      <Tag
        id={id}
        className={`input ${className}`.trim()}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        aria-required={required || undefined}
        {...rest}
      />
      {hint ? (
        <div id={hintId} className="field-hint">
          {hint}
        </div>
      ) : null}
      {error ? (
        <div id={errorId} className="field-error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  )
}

export function Textarea(props) {
  return <Input as="textarea" {...props} />
}
