export function Card({ flush = false, elevated = true, className = '', children, ...rest }) {
  const classes = [
    'card',
    flush ? 'card-flush' : '',
    elevated ? 'elev-sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
