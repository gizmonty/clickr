import { useState } from 'react'
import SetupScreen from './components/SetupScreen'
import SessionScreen from './components/SessionScreen'
import ReviewScreen from './components/ReviewScreen'

const DEFAULT_BUTTONS = [
  { id: '1', label: 'Pain point', color: '#c97070' },
  { id: '2', label: 'Delight', color: '#5bb57a' },
  { id: '3', label: 'Confusion', color: '#c9a84e' },
  { id: '4', label: 'Quote', color: '#5b8ec9' },
  { id: '5', label: 'Insight', color: '#9b6ec9' },
  { id: '6', label: 'Feature req', color: '#c96e9b' },
]

export default function App() {
  const [screen, setScreen] = useState('setup') // setup | session | review
  const [session, setSession] = useState(null)
  const [tags, setTags] = useState([])
  const [buttons, setButtons] = useState(DEFAULT_BUTTONS)

  const handleStartSession = (name, participant) => {
    setSession({ name, participant, startedAt: Date.now() })
    setTags([])
    setScreen('session')
  }

  const handleTag = (button, elapsedMs) => {
    setTags(prev => [...prev, {
      id: crypto.randomUUID(),
      label: button.label,
      color: button.color,
      timestamp: elapsedMs,
      note: '',
    }])
  }

  const handleEndSession = () => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {screen === 'setup' && (
        <SetupScreen
          buttons={buttons}
          setButtons={setButtons}
          onStart={handleStartSession}
        />
      )}
      {screen === 'session' && (
        <SessionScreen
          session={session}
          buttons={buttons}
          tags={tags}
          onTag={handleTag}
          onEnd={handleEndSession}
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
    </div>
  )
}
