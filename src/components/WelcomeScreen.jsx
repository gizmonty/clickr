import { useState } from 'react'

export default function WelcomeScreen({ onSetUser }) {
  const [name, setName] = useState('')
  const [action, setAction] = useState(null) // null | 'create' | 'join'

  const handleSubmit = (chosenAction) => {
    if (!name.trim()) return
    onSetUser(name.trim(), chosenAction)
  }

  return (
    <div className="max-w-sm mx-auto px-6 flex flex-col items-center justify-center min-h-screen">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-semibold text-gray-800 mb-2">.clicker</h1>
        <p className="text-gray-500 text-sm">UXR session tagging</p>
      </div>

      <div className="w-full space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Your name</label>
          <input
            type="text"
            placeholder="e.g. Sarah"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleSubmit('create') }}
            autoFocus
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300 text-center text-lg"
          />
        </div>

        <button
          onClick={() => handleSubmit('create')}
          disabled={!name.trim()}
          className="w-full py-4 bg-gradient-to-r from-rose-400 to-rose-500 text-white font-medium rounded-xl text-lg hover:from-rose-500 hover:to-rose-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create a session
        </button>

        <button
          onClick={() => handleSubmit('join')}
          disabled={!name.trim()}
          className="w-full py-3 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Join an existing session
        </button>
      </div>
    </div>
  )
}
