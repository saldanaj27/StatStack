import { useState, useCallback } from 'react'
import { createDraftSession, makePick, getDraftBoard } from '../../api/draft'
import DraftSetup from './components/DraftSetup'
import DraftBoard from './components/DraftBoard'
import AvailablePlayers from './components/AvailablePlayers'
import UserRoster from './components/UserRoster'
import './styles/Draft.css'

export default function Draft() {
  const [session, setSession] = useState(null)
  const [board, setBoard] = useState([])
  const [picking, setPicking] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleStart = useCallback(async (config) => {
    const result = await createDraftSession(config)
    setSession(result)
    // Fetch initial board state
    const boardData = await getDraftBoard(result.session_id)
    setBoard(boardData.picks)
    setSession(prev => ({ ...prev, ...boardData }))
  }, [])

  const handlePick = useCallback(async (playerId) => {
    if (!session || picking) return
    setPicking(true)
    try {
      const result = await makePick(session.session_id, playerId)
      // Refresh board
      const boardData = await getDraftBoard(session.session_id)
      setBoard(boardData.picks)
      setSession(prev => ({
        ...prev,
        status: result.status,
        current_pick: result.current_pick,
        current_round: result.current_round,
      }))
      setRefreshKey(k => k + 1)
    } catch (_err) {
      // Logged by Axios interceptor
    } finally {
      setPicking(false)
    }
  }, [session, picking])

  const isComplete = session?.status === 'completed'
  const isUserTurn = session && !isComplete

  return (
    <div className="draft-page">
      {!session ? (
        <DraftSetup onStart={handleStart} />
      ) : (
        <div className="draft-content">
          {/* Draft Status Bar */}
          <div className="draft-status-bar">
            <div className="draft-status-info">
              <span className="draft-round">Round {session.current_round || '-'}</span>
              <span className="draft-pick-num">Pick {session.current_pick || '-'} of {session.total_picks}</span>
            </div>
            <span className={`draft-status ${isComplete ? 'complete' : 'active'}`}>
              {isComplete ? 'Draft Complete' : isUserTurn ? 'Your Pick' : 'Waiting...'}
            </span>
          </div>

          <div className="draft-layout">
            {/* Left: Available Players */}
            <div className="draft-left">
              {!isComplete && (
                <AvailablePlayers
                  sessionId={session.session_id}
                  onPick={handlePick}
                  disabled={picking || isComplete}
                  refreshKey={refreshKey}
                />
              )}
              <UserRoster sessionId={session.session_id} refreshKey={refreshKey} />
            </div>

            {/* Right: Draft Board */}
            <div className="draft-right">
              <DraftBoard
                board={board}
                numTeams={session.num_teams}
                numRounds={session.num_rounds}
                userTeamPosition={session.user_team_position}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
