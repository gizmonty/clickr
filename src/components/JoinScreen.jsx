import { useState } from 'react'
import { findSessionByCode, joinSession } from '../lib/sessions'

export default function JoinScreen({ userName, onJoined, onBack }) {
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [foundSession, setFoundSession] = useState(null)

  const handleLookup = async () => {
    if (code.length < 6) { setError('Enter a 6-character code'); return }
    setLoading(true)
    setError('')
    try {
      const session = await findSessionByCode(code.toUpperCase())
      if (!session) { setError('Session not found'); setLoading(false); return }
      if (session.status === 'ended') { setError('This session has ended'); setLoading(false); return }
      // If no password, join immediately
      if (!session.password) {
        await joinSession(session.id, userName)
        onJoined(session.id, userName, 'observer')
        return
      }
      setFoundSession(session)
    } catch (e) {
      setError('Failed to find session')
    }
    setLoading(false)
  }

  const handleJoin = async () => {
    if (foundSession.password && password !== foundSession.password) {
      setError('Wrong password')
      return
    }
    setLoading(true)
    setError('')
    try {
      await joinSession(foundSession.id, userName)
      onJoined(foundSession.id, userName, 'observer')
    } catch (e) {
      setError('Failed to join session')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto px-6 py-10">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-800">Join session</h1>
        <p className="text-gray-500 text-sm mt-1">Joining as <span className="font-medium text-gray-700">{userName}</span></p>
      </div>

      {!foundSession ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Session code</label>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. ABC123"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              autoFocus
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 text-center text-2xl font-mono tracking-widest placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-300 uppercase"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={handleLookup}
            disabled={loading || code.length < 6}
            className="w-full py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {loading ? 'Looking up...' : 'Find session'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-100 px-4 py-3 text-center">
            <p className="text-sm text-gray-500">Joining</p>
            <p className="font-medium text-gray-800">{foundSession.name}</p>
            <p className="text-xs text-gray-400 mt-1">
              {foundSession.participants?.length || 1} participant{(foundSession.participants?.length || 1) !== 1 ? 's' : ''}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
            <input
              type="password"
              placeholder="Enter session password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-rose-400 to-rose-500 text-white rounded-xl font-medium hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 cursor-pointer transition-all"
          >
            {loading ? 'Joining...' : 'Join session'}
          </button>
        </div>
      )}

      <button onClick={onBack} className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-800 cursor-pointer">
        ← Back
      </button>
    </div>
  )
}
