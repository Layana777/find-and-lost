import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

const VARIANTS = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-ghost',
  danger: 'btn btn-secondary btn-danger',
}

function classesFor({ variant, size, block, className }) {
  return [
    VARIANTS[variant] || VARIANTS.secondary,
    size === 'lg' ? 'btn-lg' : '',
    size === 'sm' ? 'btn-sm' : '',
    block ? 'btn-block' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * زر واحد لكل الأشكال. `to` يحوّله إلى رابط تنقّل مع إبقاء المظهر نفسه،
 * و`loading` يعطّله ويعلن الحالة لقارئ الشاشة بدل تغيير النص فقط.
 */
export const Button = forwardRef(function Button(
  {
    variant = 'secondary',
    size,
    block = false,
    loading = false,
    disabled = false,
    to,
    href,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = classesFor({ variant, size, block, className })
  const isDisabled = disabled || loading

  if (to && !isDisabled) {
    return (
      <Link ref={ref} to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }

  if (href && !isDisabled) {
    return (
      <a ref={ref} href={href} className={classes} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? 'جارٍ التنفيذ…' : children}
    </button>
  )
})
