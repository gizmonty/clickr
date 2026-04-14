import { useState, useEffect, useCallback } from 'react'
import WelcomeScreen from './components/WelcomeScreen'
import SetupScreen from './components/SetupScreen'
import SessionScreen from './components/SessionScreen'
import ReviewScreen from './components/ReviewScreen'
import HistoryScreen from './components/HistoryScreen'
import JoinScreen from './components/JoinScreen'
import { saveButtons, loadButtons, saveUserName, loadUserName } from './utils/storage'
import {
  createSession, subscribeToSession, subscribeToAllSessions,
  updateTagNote, deleteSession as deleteSessionDb,
} from './lib/sessions'

const DEFAULT_BUTTONS = [
  { id: '1', label: 'Pain point', color: '#c97070' },
  { id: '2', label: 'Delight', color: '#5bb57a' },
  { id: '3', label: 'Confusion', color: '#c9a84e' },
  { id: '4', label: 'Quote', color: '#5b8ec9' },
  { id: '5', label: 'Insight', color: '#9b6ec9' },
  { id: '6', label: 'Feature req', color: '#c96e9b' },
]

export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [userName, setUserName] = useState(() => loadUserName() || '')
  const [sessionId, setSessionId] = useState(null)
  const [sessionData, setSessionData] = useState(null)
  const [role, setRole] = useState('host')
  const [buttons, setButtons] = useState(() => loadButtons() || DEFAULT_BUTTONS)
  const [history, setHistory] = useState([])
  const [isPaused, setIsPaused] = useState(false)
  const [pauseOffset, setPauseOffset] = useState(0)
  const [pausedAt, setPausedAt] = useState(null)

  useEffect(() => { saveButtons(buttons) }, [buttons])

  // Subscribe to all sessions for history once we have a user
  useEffect(() => {
    if (!userName) return
    const unsub = subscribeToAllSessions(setHistory)
    return unsub
  }, [userName])

  // Subscribe to current session for realtime
  useEffect(() => {
    if (!sessionId) return
    const unsub = subscribeToSession(sessionId, (data) => {
      setSessionData(data)
      if (data.status === 'ended' && screen === 'session') {
        setScreen('review')
      }
    })
    return unsub
  }, [sessionId, screen])

  // Welcome screen → sets user and picks next screen
  const handleSetUser = (name, action) => {
    setUserName(name)
    saveUserName(name)
    setScreen(action === 'join' ? 'join' : 'setup')
  }

  const handleLogout = () => {
    setUserName('')
    saveUserName('')
    setSessionId(null)
    setSessionData(null)
    setScreen('welcome')
  }

  // Create session → writes to Firestore, transitions to live session
  const handleStartSession = async ({ projectName, sessionName, notes, password }) => {
    setRole('host')
    const { id } = await createSession({
      name: sessionName,
      projectName,
      notes,
      hostName: userName,
      buttons,
      password,
    })
    setSessionId(id)
    setIsPaused(false)
    setPauseOffset(0)
    setPausedAt(null)
    setScreen('session')
  }

  const handleJoined = (id, name, joinRole) => {
    setSessionId(id)
    setRole(joinRole)
    setIsPaused(false)
    setPauseOffset(0)
    setPausedAt(null)
    setScreen('session')
  }

  const handlePauseToggle = useCallback(() => {
    if (isPaused) {
      setPauseOffset(prev => prev + (Date.now() - pausedAt))
      setPausedAt(null)
      setIsPaused(false)
    } else {
      setPausedAt(Date.now())
      setIsPaused(true)
    }
  }, [isPaused, pausedAt])

  const handleEndSession = () => setScreen('review')

  const handleNewSession = () => {
    setSessionId(null)
    setSessionData(null)
    setScreen('setup')
  }

  const handleUpdateTagNote = async (tagId, note) => {
    if (!sessionId || !sessionData) return
    await updateTagNote(sessionId, sessionData.tags || [], tagId, note)
  }

  const handleLoadSession = (savedSession) => {
    setSessionId(savedSession.id)
    setSessionData(savedSession)
    setRole('host')
    setScreen('review')
  }

  const handleDeleteSession = async (id) => {
    await deleteSessionDb(id)
  }

  // No user yet → welcome
  if (!userName || screen === 'welcome') {
    return (
      <div className="min-h-screen bg-gray-50">
        <WelcomeScreen onSetUser={handleSetUser} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {screen === 'setup' && (
        <SetupScreen
          userName={userName}
          buttons={buttons}
          setButtons={setButtons}
          onStart={handleStartSession}
          onBack={() => { handleLogout() }}
          onOpenHistory={() => setScreen('history')}
          historyCount={history.length}
        />
      )}
      {screen === 'join' && (
        <JoinScreen
          userName={userName}
          onJoined={handleJoined}
          onBack={() => { handleLogout() }}
        />
      )}
      {screen === 'session' && sessionData && (
        <SessionScreen
          sessionId={sessionId}
          sessionData={sessionData}
          userName={userName}
          role={role}
          onEnd={handleEndSession}
          isPaused={isPaused}
          pauseOffset={pauseOffset}
          pausedAt={pausedAt}
          onPauseToggle={handlePauseToggle}
        />
      )}
      {screen === 'review' && sessionData && (
        <ReviewScreen
          session={sessionData}
          tags={sessionData.tags || []}
          participants={sessionData.participants || []}
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
