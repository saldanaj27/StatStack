import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getUsageTrends } from '../../../api/analytics'
import '../styles/UsageTrendCharts.css'

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']

export default function UsageTrendCharts({ teamId, numGames }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const result = await getUsageTrends(teamId, numGames)
        setData(result)
      } catch (_error) {
        // Logged by Axios interceptor
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [teamId, numGames])

  if (loading || !data || data.per_game.length === 0) return null

  // Collect all player names across all weeks
  const allTargetPlayers = new Set()
  const allCarryPlayers = new Set()
  data.per_game.forEach(week => {
    Object.keys(week.target_shares).forEach(n => allTargetPlayers.add(n))
    Object.keys(week.carry_shares).forEach(n => allCarryPlayers.add(n))
  })

  // Rank by total share across all weeks and take top 5
  const rankPlayers = (players, key) => {
    const totals = {}
    players.forEach(name => { totals[name] = 0 })
    data.per_game.forEach(week => {
      players.forEach(name => {
        totals[name] += week[key][name] || 0
      })
    })
    return [...players].sort((a, b) => totals[b] - totals[a]).slice(0, 5)
  }

  const topTargetPlayers = rankPlayers(allTargetPlayers, 'target_shares')
  const topCarryPlayers = rankPlayers(allCarryPlayers, 'carry_shares')

  // Build chart data
  const targetChartData = data.per_game.map(week => {
    const row = { week: `Wk ${week.week}` }
    topTargetPlayers.forEach(name => { row[name] = week.target_shares[name] || 0 })
    return row
  })

  const carryChartData = data.per_game.map(week => {
    const row = { week: `Wk ${week.week}` }
    topCarryPlayers.forEach(name => { row[name] = week.carry_shares[name] || 0 })
    return row
  })

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="usage-trend-tooltip">
          <p className="usage-trend-tooltip-label">{label}</p>
          {payload.map((entry, i) => (
            <p key={i} className="usage-trend-tooltip-entry" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}%
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Get last name for legend brevity
  const lastName = (name) => name.split(' ').pop()

  return (
    <div className="usage-trend-charts">
      {topTargetPlayers.length > 0 && (
        <div className="usage-trend-card">
          <h5 className="usage-trend-title">Target Share Trends (WR/TE)</h5>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={targetChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={lastName} wrapperStyle={{ fontSize: 11 }} />
              {topTargetPlayers.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} name={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {topCarryPlayers.length > 0 && (
        <div className="usage-trend-card">
          <h5 className="usage-trend-title">Carry Share Trends (RB)</h5>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={carryChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={lastName} wrapperStyle={{ fontSize: 11 }} />
              {topCarryPlayers.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} name={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
