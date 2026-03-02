import './Skeleton.css'

export default function SkeletonLine({ width = '100%', height = '1rem', style }) {
  return (
    <div
      className="skeleton"
      aria-hidden="true"
      style={{ width, height, ...style }}
    />
  )
}
