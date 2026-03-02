import SkeletonLine from '../../../components/Skeleton/SkeletonLine'
import SkeletonCircle from '../../../components/Skeleton/SkeletonCircle'
import '../styles/PlayerCard.css'

export default function PlayerCardSkeleton() {
  return (
    <div className="player-card" aria-hidden="true">
      <div className="player-card-header">
        <SkeletonCircle size="56px" />
        <div className="player-info" style={{ flex: 1 }}>
          <SkeletonLine width="70%" height="1rem" style={{ marginBottom: '0.25rem' }} />
          <SkeletonLine width="40%" height="0.75rem" />
        </div>
        <SkeletonLine width="48px" height="36px" style={{ borderRadius: '0.375rem', flexShrink: 0 }} />
      </div>
      <div className="player-stats-row">
        {[0, 1, 2, 3].map((i) => (
          <div className="stat-item" key={i}>
            <SkeletonLine width="60%" height="0.875rem" style={{ margin: '0 auto 0.25rem' }} />
            <SkeletonLine width="40%" height="0.65rem" style={{ margin: '0 auto' }} />
          </div>
        ))}
      </div>
      <span className="skeleton-sr-only">Loading player...</span>
    </div>
  )
}
