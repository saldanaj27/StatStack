import './EmptyState.css'

export default function EmptyState({ icon, message, submessage }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <p className="empty-state__message">{message}</p>
      {submessage && <p className="empty-state__submessage">{submessage}</p>}
    </div>
  )
}
