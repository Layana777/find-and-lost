import { useId } from 'react'

/** قائمة اختيار بنفس مظهر `.input` وبـ label مرتبط. */
export function Select({
  label,
  error,
  hint,
  options = [],
  placeholder,
  id: providedId,
  required = false,
  ...rest
}) {
  const generatedId = useId()
  const id = providedId || generatedId
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <div className="field">
      {label ? (
        <label htmlFor={id}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
      ) : null}
      <select
        id={id}
        className="input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        aria-required={required || undefined}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
