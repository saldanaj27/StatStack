import SkeletonLine from '../../../components/Skeleton/SkeletonLine'
import SkeletonCircle from '../../../components/Skeleton/SkeletonCircle'
import '../styles/GameInfo.css'

export default function GameInfoSkeleton() {
  return (
    <div aria-hidden="true">
      {/* Game title area */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <SkeletonCircle size="48px" />
        <SkeletonLine width="200px" height="1.5rem" />
        <SkeletonCircle size="48px" />
      </div>

      {/* Tab bar placeholder */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
        <SkeletonLine width="100px" height="36px" style={{ borderRadius: '0.5rem' }} />
        <SkeletonLine width="100px" height="36px" style={{ borderRadius: '0.5rem' }} />
        <SkeletonLine width="100px" height="36px" style={{ borderRadius: '0.5rem' }} />
      </div>

      {/* Content placeholder */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--border-radius-md)',
        border: '1px solid var(--border-color)',
        padding: '1.5rem',
      }}>
        <SkeletonLine width="40%" height="1.25rem" style={{ marginBottom: '1rem' }} />
        <SkeletonLine width="100%" height="0.875rem" style={{ marginBottom: '0.5rem' }} />
        <SkeletonLine width="100%" height="0.875rem" style={{ marginBottom: '0.5rem' }} />
        <SkeletonLine width="70%" height="0.875rem" />
      </div>
      <span className="skeleton-sr-only">Loading game...</span>
    </div>
  )
}
