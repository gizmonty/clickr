import { useState, useRef, useEffect } from 'react'
import TopBar from './TopBar'

export default function SetupScreen({
  userName, buttons, setButtons, onStart, onLogoClick, onLogout,
  onOpenHistory, historyCount, existingProjects, liveSession, onResume,
}) {
  const [selectedProject, setSelectedProject] = useState('')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [localProjects, setLocalProjects] = useState([])
  const [sessionName, setSessionName] = useState('')
  const [password, setPassword] = useState('')
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserMenu])

  const COLORS = [
    '#c97070', '#5bb57a', '#c9a84e', '#5b8ec9',
    '#9b6ec9', '#c96e9b', '#e07850', '#6bc9b8',
  ]

  const canStart = !!selectedProject && !!sessionName.trim()

  const allProjects = [...new Set([...existingProjects, ...localProjects])].sort()

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return
    const name = newProjectName.trim()
    setLocalProjects(prev => prev.includes(name) ? prev : [...prev, name])
    setSelectedProject(name)
    setNewProjectName('')
    setShowNewProjectModal(false)
  }

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
        onStart({ projectName: selectedProject, sessionName: sessionName.trim(), notes: notes.trim(), password: password.trim() }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out. Make sure Firestore is enabled.')), 10000)),
      ])
    } catch (e) {
      setError(e.message || 'Failed to start session.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        onLogoClick={onLogoClick}
        right={
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(prev => !prev)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="text-sm text-gray-600 hidden sm:block">{userName}</span>
              <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center text-xs font-medium">
                {userName.charAt(0).toUpperCase()}
              </span>
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={() => { setShowUserMenu(false); onLogout() }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Switch user
                </button>
              </div>
            )}
          </div>
        }
      />

      <div className="max-w-lg mx-auto px-6 py-8">
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

          {/* Project — dropdown + new project button */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Project <span className="text-blue-400">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 appearance-none"
                >
                  <option value="">Select a project...</option>
                  {allProjects.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
              </div>
              {/* + New project button */}
              <button
                onClick={() => setShowNewProjectModal(true)}
                title="New project"
                className="w-12 h-12 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-blue-500 transition-colors cursor-pointer flex items-center justify-center text-xl font-light shrink-0"
              >
                +
              </button>
            </div>
          </div>

          {/* Session name */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Session name <span className="text-blue-400">*</span></label>
            <input
              type="text"
              placeholder="e.g. P03 - Onboarding usability test"
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Session password (optional)</label>
            <input
              type="text"
              placeholder="Leave empty for open access"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              placeholder="Goals, context, things to watch for..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>
        </div>

        {/* Tag buttons */}
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
                    <input type="text" value={editLabel} onChange={e => setEditLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      className="flex-1 min-w-[100px] px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none" autoFocus />
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

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

        <button
          onClick={handleStart}
          disabled={loading || !canStart}
          className="w-full py-4 bg-gradient-to-r from-blue-400 to-blue-500 text-white font-medium rounded-xl text-lg hover:from-blue-500 hover:to-blue-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : 'Start session'}
        </button>
      </div>

      {/* New project modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">New project</h2>
            <input
              type="text"
              placeholder="e.g. Mobile App Redesign"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateProject(); if (e.key === 'Escape') setShowNewProjectModal(false) }}
              autoFocus
              className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowNewProjectModal(false); setNewProjectName('') }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium cursor-pointer hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateProject} disabled={!newProjectName.trim()}
                className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-medium cursor-pointer hover:bg-gray-900 transition-colors disabled:opacity-40">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
