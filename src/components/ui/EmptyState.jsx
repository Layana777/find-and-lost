import { Button } from './Button'

/** حالة «لا بيانات» برسالة واضحة وإجراء يخرج المستخدم منها. */
export function EmptyState({ title, body, actionLabel, actionTo, onAction }) {
  return (
    <div className="state-block">
      <h3 className="state-title">{title}</h3>
      {body ? <p className="state-body">{body}</p> : null}
      {actionLabel ? (
        <Button variant="primary" to={actionTo} onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
