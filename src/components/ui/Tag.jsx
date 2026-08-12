const TONES = {
  accent: 'tag tag-accent',
  accent2: 'tag tag-accent-2',
  neutral: 'tag tag-neutral',
  outline: 'tag tag-outline',
}

export function Tag({ tone = 'neutral', className = '', children }) {
  return <span className={`${TONES[tone] || TONES.neutral} ${className}`.trim()}>{children}</span>
}
