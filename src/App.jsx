import { useState, useEffect, useCallback, useMemo } from 'react'
import WelcomeScreen from './components/WelcomeScreen'
import SetupScreen from './components/SetupScreen'
import SessionScreen from './components/SessionScreen'
import ReviewScreen from './components/ReviewScreen'
import SummaryScreen from './components/SummaryScreen'
import HistoryScreen from './components/HistoryScreen'
import JoinScreen from './components/JoinScreen'
import { saveButtons, loadButtons, saveUserName, loadUserName } from './utils/storage'
import {
  createSession, subscribeToSession, subscribeToAllSessions,
  updateTagNote, deleteSession as deleteSessionDb,
} from './lib/sessions'
import { registerPresence, startHeartbeat, clearPresence } from './lib/presence'

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
  const [historyProject, setHistoryProject] = useState(null)

  useEffect(() => { saveButtons(buttons) }, [buttons])

  // Register presence + heartbeat when user is set, clean up on logout/unload
  useEffect(() => {
    if (!userName) return
    registerPresence(userName).catch(() => {})
    const stopHeartbeat = startHeartbeat(userName)

    // Clear presence when tab closes or refreshes
    const handleUnload = () => clearPresence(userName)
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      stopHeartbeat()
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [userName])

  useEffect(() => {
    if (!userName) return
    const unsub = subscribeToAllSessions(setHistory)
    return unsub
  }, [userName])

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

  // Find any live session this user is a participant of
  const liveSession = useMemo(() => {
    return history.find(s =>
      s.status === 'live' &&
      s.participants?.some(p => p.name === userName)
    ) || null
  }, [history, userName])

  // Derive unique project names from history
  const existingProjects = useMemo(() => {
    const names = history.map(s => s.projectName).filter(Boolean)
    return [...new Set(names)].sort()
  }, [history])

  const handleResumeSession = (session) => {
    setSessionId(session.id)
    setSessionData(session)
    const myRole = session.participants?.find(p => p.name === userName)?.role || 'observer'
    setRole(myRole)
    setIsPaused(false)
    setPauseOffset(0)
    setPausedAt(null)
    setScreen('session')
  }

  const handleSetUser = (name, action) => {
    setUserName(name)
    saveUserName(name)
    setScreen(action === 'join' ? 'join' : 'setup')
  }

  const handleGoHome = () => {
    // When logged in, logo goes to setup (create/join choice), not welcome
    setSessionId(null)
    setSessionData(null)
    setScreen('setup')
  }

  const handleGoToWelcome = () => {
    setSessionId(null)
    setSessionData(null)
    setScreen('welcome')
  }

  const handleLogout = async () => {
    await clearPresence(userName)
    setUserName('')
    saveUserName('')
    setSessionId(null)
    setSessionData(null)
    setScreen('welcome')
  }

  const handleGoToProject = () => {
    setHistoryProject(sessionData?.projectName || null)
    setScreen('history')
  }

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
          onLogoClick={handleGoToWelcome}
          onLogout={handleLogout}
          onOpenHistory={() => { setHistoryProject(null); setScreen('history') }}
          historyCount={history.length}
          existingProjects={existingProjects}
          liveSession={liveSession}
          onResume={handleResumeSession}
        />
      )}
      {screen === 'join' && (
        <JoinScreen
          userName={userName}
          onJoined={handleJoined}
          onBack={handleLogout}
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
          onGoHome={handleGoHome}
        />
      )}
      {screen === 'summary' && sessionData && (
        <SummaryScreen
          session={sessionData}
          tags={sessionData.tags || []}
          participants={sessionData.participants || []}
          onReview={() => setScreen('review')}
          onNewSession={handleNewSession}
          onLogoClick={handleGoHome}
          onGoToProject={handleGoToProject}
        />
      )}
      {screen === 'review' && sessionData && (
        <ReviewScreen
          session={sessionData}
          tags={sessionData.tags || []}
          participants={sessionData.participants || []}
          onUpdateNote={handleUpdateTagNote}
          onNewSession={handleNewSession}
          onLogoClick={handleGoHome}
          onGoToProject={handleGoToProject}
        />
      )}
      {screen === 'history' && (
        <HistoryScreen
          sessions={history}
          onLoad={handleLoadSession}
          onDelete={handleDeleteSession}
          onBack={() => setScreen('setup')}
          onLogoClick={handleGoHome}
          initialProject={historyProject}
        />
      )}
    </div>
  )
}
