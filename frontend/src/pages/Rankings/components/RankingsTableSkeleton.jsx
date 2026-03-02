import SkeletonLine from '../../../components/Skeleton/SkeletonLine'

export default function RankingsTableSkeleton({ columns, rowCount = 15 }) {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: rowCount }, (_, rowIdx) => (
        <tr key={rowIdx}>
          {columns.map((col) => (
            <td key={col.key}>
              <SkeletonLine
                width={col.key === 'name' ? '80%' : '60%'}
                height="0.875rem"
              />
            </td>
          ))}
        </tr>
      ))}
      <tr>
        <td colSpan={columns.length}>
          <span className="skeleton-sr-only">Loading rankings...</span>
        </td>
      </tr>
    </tbody>
  )
}
