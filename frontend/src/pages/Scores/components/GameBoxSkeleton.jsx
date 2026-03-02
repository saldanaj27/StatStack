import SkeletonLine from '../../../components/Skeleton/SkeletonLine'
import SkeletonCircle from '../../../components/Skeleton/SkeletonCircle'
import './GameBox.css'

export default function GameBoxSkeleton() {
  return (
    <div className="gamebox" aria-hidden="true">
      <div className="gamebox-header">
        <SkeletonLine width="60px" height="0.7rem" />
        <SkeletonLine width="80px" height="0.7rem" />
      </div>
      {[0, 1].map((i) => (
        <div className="team-row" key={i}>
          <SkeletonCircle size="24px" />
          <SkeletonLine width="36px" height="1rem" style={{ flexShrink: 0 }} />
          <SkeletonLine width="100%" height="0.8rem" />
          <SkeletonLine width="28px" height="1.25rem" style={{ flexShrink: 0 }} />
        </div>
      ))}
      <div className="gamebox-footer">
        <SkeletonLine width="120px" height="0.7rem" />
        <SkeletonLine width="50px" height="0.7rem" />
      </div>
      <span className="skeleton-sr-only">Loading game...</span>
    </div>
  )
}
