import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * نافذة حوارية بإدارة تركيز كاملة: تنقل التركيز إلى الداخل عند الفتح، تحبسه
 * داخلها بـ Tab، تغلق بـ Escape، وتعيد التركيز إلى العنصر الذي فتحها.
 * تستعمل بدل alert()/confirm() في كل التطبيق.
 */
export function Dialog({ open, onClose, title, description, children, actions }) {
  const dialogRef = useRef(null)
  const openerRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return undefined

    openerRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const node = dialogRef.current
    const first = node?.querySelector(FOCUSABLE)
    ;(first || node)?.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !node) return

      const focusables = Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (!focusables.length) return

      const firstEl = focusables[0]
      const lastEl = focusables[focusables.length - 1]

      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault()
        lastEl.focus()
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      // إعادة التركيز إلى الزر الذي فتح النافذة
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        ref={dialogRef}
        tabIndex={-1}
      >
        <h2 className="dialog-title" id={titleId}>
          {title}
        </h2>
        {description ? (
          <p className="dialog-body" id={descriptionId}>
            {description}
          </p>
        ) : null}
        {children}
        {actions ? <div className="dialog-actions">{actions}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
