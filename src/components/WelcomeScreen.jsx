import { useState } from 'react'
import { checkLdapAvailable, isOwnDevice } from '../lib/presence'

export default function WelcomeScreen({ onSetUser }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (action) => {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    try {
      // Allow re-login from the same device (refresh, tab reopen)
      const ownDevice = await isOwnDevice(name.trim())
      if (!ownDevice) {
        const { taken, lastSeen } = await checkLdapAvailable(name.trim())
        if (taken) {
          const timeAgo = lastSeen
            ? `Last active ${Math.round((Date.now() - lastSeen.getTime()) / 60000)} min ago.`
            : ''
          setError(`"${name.trim()}" is already logged in on another device. ${timeAgo} Try again in a few minutes or use a different ldap.`)
          setLoading(false)
          return
        }
      }
      onSetUser(name.trim(), action)
    } catch (e) {
      // If Firestore check fails (offline, etc.), let them through
      console.warn('Presence check failed, allowing login:', e)
      onSetUser(name.trim(), action)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-6 flex flex-col items-center justify-center min-h-screen">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-semibold text-gray-800 mb-2">.clickr</h1>
        <p className="text-gray-500 text-sm">UXR Tagging Tool</p>
      </div>

      <div className="w-full space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Your ldap</label>
          <input
            type="text"
            placeholder="e.g. Bea"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleSubmit('create') }}
            autoFocus
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300 text-center text-lg"
          />
          {error && (
            <p className="mt-2 text-sm text-red-500 text-center leading-snug">{error}</p>
          )}
        </div>

        <button
          onClick={() => handleSubmit('create')}
          disabled={!name.trim() || loading}
          className="w-full py-4 bg-gradient-to-r from-rose-400 to-rose-500 text-white font-medium rounded-xl text-lg hover:from-rose-500 hover:to-rose-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Checking...' : 'Create a session'}
        </button>

        <button
          onClick={() => handleSubmit('join')}
          disabled={!name.trim() || loading}
          className="w-full py-3 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Join an existing session
        </button>
      </div>
    </div>
  )
}
