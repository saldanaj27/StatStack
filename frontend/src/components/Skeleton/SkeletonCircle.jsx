import './Skeleton.css'

export default function SkeletonCircle({ size = '40px' }) {
  return (
    <div
      className="skeleton skeleton--circle"
      aria-hidden="true"
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  )
}
