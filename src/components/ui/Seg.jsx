import { useId } from 'react'

/**
 * مجموعة خيارات متجاورة (segmented control) مبنية على أزرار راديو حقيقية،
 * فتعمل بالكيبورد وقارئ الشاشة دون ARIA إضافي.
 */
export function Seg({ name, value, onChange, options, size, ariaLabel, className = '' }) {
  const groupId = useId()

  return (
    <div
      className={`seg ${size === 'lg' ? 'seg-lg' : ''} ${className}`.trim()}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <label className="seg-opt" key={option.value}>
          <input
            type="radio"
            name={`${name}-${groupId}`}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}
