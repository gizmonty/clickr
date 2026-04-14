import { useState, useEffect, useCallback } from 'react'
import SetupScreen from './components/SetupScreen'
import SessionScreen from './components/SessionScreen'
import ReviewScreen from './components/ReviewScreen'
import HistoryScreen from './components/HistoryScreen'
import { saveSessions, loadSessions, saveButtons, loadButtons } from './utils/storage'

const DEFAULT_BUTTONS = [
  { id: '1', label: 'Pain point', color: '#c97070' },
  { id: '2', label: 'Delight', color: '#5bb57a' },
  { id: '3', label: 'Confusion', color: '#c9a84e' },
  { id: '4', label: 'Quote', color: '#5b8ec9' },
  { id: '5', label: 'Insight', color: '#9b6ec9' },
  { id: '6', label: 'Feature req', color: '#c96e9b' },
]

export default function App() {
  const [screen, setScreen] = useState('setup')
  const [session, setSession] = useState(null)
  const [tags, setTags] = useState([])
  const [buttons, setButtons] = useState(() => loadButtons() || DEFAULT_BUTTONS)
  const [history, setHistory] = useState(() => loadSessions())
  const [isPaused, setIsPaused] = useState(false)
  const [pauseOffset, setPauseOffset] = useState(0)
  const [pausedAt, setPausedAt] = useState(null)

  // Persist buttons whenever they change
  useEffect(() => { saveButtons(buttons) }, [buttons])

  const handleStartSession = (name, participant) => {
    setSession({ name, participant, startedAt: Date.now() })
    setTags([])
    setIsPaused(false)
    setPauseOffset(0)
    setPausedAt(null)
    setScreen('session')
  }

  const handleTag = useCallback((button, elapsedMs, note = '') => {
    setTags(prev => [...prev, {
      id: crypto.randomUUID(),
      label: button.label,
      color: button.color,
      timestamp: elapsedMs,
      note,
    }])
  }, [])

  const handleUndo = useCallback(() => {
    setTags(prev => prev.length > 0 ? prev.slice(0, -1) : prev)
  }, [])

  const handlePauseToggle = useCallback(() => {
    if (isPaused) {
      // Resume: add the paused duration to offset
      setPauseOffset(prev => prev + (Date.now() - pausedAt))
      setPausedAt(null)
      setIsPaused(false)
    } else {
      setPausedAt(Date.now())
      setIsPaused(true)
    }
  }, [isPaused, pausedAt])

  const handleEndSession = () => {
    // Save to history
    const completedSession = {
      ...session,
      endedAt: Date.now(),
      tags: [...tags],
      id: crypto.randomUUID(),
    }
    const updated = [completedSession, ...history]
    setHistory(updated)
    saveSessions(updated)
    setScreen('review')
  }

  const handleNewSession = () => {
    setSession(null)
    setTags([])
    setScreen('setup')
  }

  const handleUpdateTagNote = (tagId, note) => {
    setTags(prev => prev.map(t => t.id === tagId ? { ...t, note } : t))
  }

  const handleOpenHistory = () => setScreen('history')

  const handleLoadSession = (savedSession) => {
    setSession(savedSession)
    setTags(savedSession.tags || [])
    setScreen('review')
  }

  const handleDeleteSession = (sessionId) => {
    const updated = history.filter(s => s.id !== sessionId)
    setHistory(updated)
    saveSessions(updated)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {screen === 'setup' && (
        <SetupScreen
          buttons={buttons}
          setButtons={setButtons}
          onStart={handleStartSession}
          onOpenHistory={handleOpenHistory}
          historyCount={history.length}
        />
      )}
      {screen === 'session' && (
        <SessionScreen
          session={session}
          buttons={buttons}
          tags={tags}
          onTag={handleTag}
          onUndo={handleUndo}
          onEnd={handleEndSession}
          isPaused={isPaused}
          pauseOffset={pauseOffset}
          pausedAt={pausedAt}
          onPauseToggle={handlePauseToggle}
        />
      )}
      {screen === 'review' && (
        <ReviewScreen
          session={session}
          tags={tags}
          onUpdateNote={handleUpdateTagNote}
          onNewSession={handleNewSession}
        />
      )}
      {screen === 'history' && (
        <HistoryScreen
          sessions={history}
          onLoad={handleLoadSession}
          onDelete={handleDeleteSession}
          onBack={() => setScreen('setup')}
        />
      )}
    </div>
  )
}
