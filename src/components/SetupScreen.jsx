import { useState, useMemo } from 'react'

export default function SetupScreen({ userName, buttons, setButtons, onStart, onBack, onOpenHistory, historyCount, existingProjects, liveSession, onResume }) {
  const [projectMode, setProjectMode] = useState('new') // 'new' | 'existing'
  const [projectName, setProjectName] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [password, setPassword] = useState('')
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const COLORS = [
    '#c97070', '#5bb57a', '#c9a84e', '#5b8ec9',
    '#9b6ec9', '#c96e9b', '#e07850', '#6bc9b8',
  ]

  const activeProject = projectMode === 'new' ? projectName.trim() : selectedProject
  const canStart = !!activeProject && !!sessionName.trim()

  const handleAdd = () => {
    const usedColors = buttons.map(b => b.color)
    const nextColor = COLORS.find(c => !usedColors.includes(c)) || COLORS[0]
    setButtons(prev => [...prev, { id: crypto.randomUUID(), label: 'New tag', color: nextColor }])
  }

  const handleRemove = (id) => setButtons(prev => prev.filter(b => b.id !== id))

  const handleMoveUp = (i) => {
    if (i === 0) return
    setButtons(prev => { const n = [...prev]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n })
  }

  const handleMoveDown = (i) => {
    setButtons(prev => { if (i >= prev.length - 1) return prev; const n = [...prev]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n })
  }

  const startEdit = (btn) => { setEditingId(btn.id); setEditLabel(btn.label); setEditColor(btn.color) }
  const saveEdit = () => {
    setButtons(prev => prev.map(b => b.id === editingId ? { ...b, label: editLabel, color: editColor } : b))
    setEditingId(null)
  }

  const handleStart = async () => {
    if (!canStart) return
    setLoading(true)
    setError('')
    try {
      await Promise.race([
        onStart({
          projectName: activeProject,
          sessionName: sessionName.trim(),
          notes: notes.trim(),
          password: password.trim(),
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error(
          'Connection timed out. Make sure Firestore is enabled in your Firebase Console.'
        )), 10000)),
      ])
    } catch (e) {
      console.error('Failed to start session:', e)
      setError(e.message || 'Failed to start session.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer">← Back</button>
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center text-xs font-medium">
            {userName.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm text-gray-600">{userName}</span>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-gray-800 mb-6">New session</h1>

      {/* Resume live session banner */}
      {liveSession && (
        <button
          onClick={() => onResume(liveSession)}
          className="w-full mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-left hover:bg-green-100 transition-colors cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800">Session in progress</p>
            <p className="text-xs text-green-600 truncate">{liveSession.projectName && `${liveSession.projectName} · `}{liveSession.name}</p>
          </div>
          <span className="text-sm font-medium text-green-700 shrink-0">Resume →</span>
        </button>
      )}

      {historyCount > 0 && (
        <button
          onClick={onOpenHistory}
          className="w-full mb-6 py-3 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          📋 Past sessions ({historyCount})
        </button>
      )}

      <div className="space-y-4 mb-8">

        {/* Project — required */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Project <span className="text-rose-400">*</span>
          </label>
          {/* Toggle new vs existing */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setProjectMode('new')}
              className={`flex-1 py-2 text-sm rounded-lg border cursor-pointer transition-colors ${projectMode === 'new' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
            >
              New project
            </button>
            <button
              onClick={() => setProjectMode('existing')}
              disabled={existingProjects.length === 0}
              className={`flex-1 py-2 text-sm rounded-lg border cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${projectMode === 'existing' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
            >
              Existing project
            </button>
          </div>
          {projectMode === 'new' ? (
            <input
              type="text"
              placeholder="e.g. Mobile App Redesign"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          ) : (
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              <option value="">Select a project...</option>
              {existingProjects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>

        {/* Session name */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Session name <span className="text-rose-400">*</span></label>
          <input
            type="text"
            placeholder="e.g. P03 - Onboarding usability test"
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>

        {/* Password first, then notes */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Session password (optional)</label>
          <input
            type="text"
            placeholder="Leave empty for open access"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Notes (optional)</label>
          <textarea
            placeholder="Goals, context, things to watch for..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
          />
        </div>
      </div>

      {/* Buttons config */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-600">Tag buttons ({buttons.length})</h2>
          <button onClick={handleAdd} className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer">+ Add</button>
        </div>
        <div className="space-y-2">
          {buttons.map((btn, i) => (
            <div key={btn.id} className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 border border-gray-100">
              <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: btn.color }} />
              {editingId === btn.id ? (
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <input
                    type="text" value={editLabel} onChange={e => setEditLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                    className="flex-1 min-w-[100px] px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none" autoFocus
                  />
                  <div className="flex gap-1">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setEditColor(c)}
                        className={`w-5 h-5 rounded-full cursor-pointer ${editColor === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <button onClick={saveEdit} className="text-xs text-green-600 font-medium cursor-pointer">Save</button>
                  <button onClick={() => handleRemove(btn.id)} className="text-xs text-red-400 cursor-pointer">Remove</button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-left text-gray-700">{btn.label}</span>
                  <span className="text-xs text-gray-300 font-mono">{i + 1}</span>
                  <button onClick={() => handleMoveUp(i)} className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer">↑</button>
                  <button onClick={() => handleMoveDown(i)} className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer">↓</button>
                  <button onClick={() => startEdit(btn)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Press 1–{buttons.length} during session for quick tagging</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <button
        onClick={handleStart}
        disabled={loading || !canStart}
        className="w-full py-4 bg-gradient-to-r from-rose-400 to-rose-500 text-white font-medium rounded-xl text-lg hover:from-rose-500 hover:to-rose-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Starting...' : 'Start session'}
      </button>
    </div>
  )
}
