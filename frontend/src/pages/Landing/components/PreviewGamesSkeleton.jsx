import SkeletonLine from '../../../components/Skeleton/SkeletonLine'
import '../Landing.css'

export default function PreviewGamesSkeleton() {
  return (
    <section className="preview-section" aria-hidden="true">
      <div className="preview-header">
        <SkeletonLine width="180px" height="1.5rem" />
        <SkeletonLine width="80px" height="0.9rem" />
      </div>
      <div className="preview-games">
        {[0, 1, 2].map((i) => (
          <div className="preview-game-card" key={i}>
            <div className="preview-teams">
              <SkeletonLine width="36px" height="1rem" />
              <span className="preview-at" style={{ visibility: 'hidden' }}>@</span>
              <SkeletonLine width="36px" height="1rem" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <SkeletonLine width="80px" height="0.8rem" style={{ margin: '0 auto' }} />
            </div>
          </div>
        ))}
      </div>
      <span className="skeleton-sr-only">Loading upcoming games...</span>
    </section>
  )
}
