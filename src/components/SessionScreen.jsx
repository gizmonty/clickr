import { useState, useEffect, useRef, useCallback } from 'react'
import { formatTime } from '../utils/time'
import { addTag, removeLastTag, endSession as endSessionDb, updateSessionButtons, addReaction } from '../lib/sessions'
import TopBar from './TopBar'

const COLORS = [
  '#c97070', '#5bb57a', '#c9a84e', '#5b8ec9',
  '#9b6ec9', '#c96e9b', '#e07850', '#6bc9b8',
]

const REACTIONS = ['👀', '🔥', '⚠️', '💡', '❓']

export default function SessionScreen({
  sessionId, sessionData, userName, role,
  onEnd, isPaused, pauseOffset, pausedAt, onPauseToggle, onGoHome,
}) {
  const [elapsed, setElapsed] = useState(0)
  const [lastClicked, setLastClicked] = useState(null)
  const [showAddButton, setShowAddButton] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [showLog, setShowLog] = useState(true)
  const [logFilter, setLogFilter] = useState('all')
  const [floatingReactions, setFloatingReactions] = useState([])
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const intervalRef = useRef(null)
  const addInputRef = useRef(null)

  const buttons = sessionData?.buttons || []
  const tags = sessionData?.tags || []
  const participants = sessionData?.participants || []
  const reactions = sessionData?.reactions || []

  // Show incoming reactions as floating emoji
  const prevReactionsLen = useRef(0)
  useEffect(() => {
    if (reactions.length > prevReactionsLen.current) {
      const newOnes = reactions.slice(prevReactionsLen.current)
      newOnes.forEach(r => {
        const id = crypto.randomUUID()
        setFloatingReactions(prev => [...prev, { ...r, floatId: id }])
        setTimeout(() => setFloatingReactions(prev => prev.filter(f => f.floatId !== id)), 2500)
      })
    }
    prevReactionsLen.current = reactions.length
  }, [reactions])

  // Timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (isPaused || !sessionData?.startedAt) return
      setElapsed(Date.now() - sessionData.startedAt - pauseOffset)
    }, 100)
    return () => clearInterval(intervalRef.current)
  }, [sessionData?.startedAt, isPaused, pauseOffset])

  useEffect(() => {
    if (isPaused && pausedAt && sessionData?.startedAt) {
      setElapsed(pausedAt - sessionData.startedAt - pauseOffset)
    }
  }, [isPaused, pausedAt, sessionData?.startedAt, pauseOffset])

  const getElapsed = useCallback(() => {
    if (!sessionData?.startedAt) return 0
    if (isPaused && pausedAt) return pausedAt - sessionData.startedAt - pauseOffset
    return Date.now() - sessionData.startedAt - pauseOffset
  }, [isPaused, pausedAt, sessionData?.startedAt, pauseOffset])

  const handleClick = useCallback(async (btn) => {
    if (isPaused) return
    const ts = getElapsed()
    const tag = {
      id: crypto.randomUUID(),
      label: btn.label,
      color: btn.color,
      timestamp: ts,
      note: '',
      taggedBy: userName,
      participant: '',
    }
    setLastClicked(btn.id)
    setTimeout(() => setLastClicked(null), 300)
    await addTag(sessionId, tag)
  }, [isPaused, getElapsed, sessionId, userName])

  const handleUndo = useCallback(async () => {
    if (tags.length === 0) return
    await removeLastTag(sessionId, tags)
  }, [sessionId, tags])

  const handleEnd = async () => {
    await endSessionDb(sessionId)
    onEnd()
  }

  const handleEndConfirmed = async () => {
    setShowEndConfirm(false)
    await endSessionDb(sessionId)
    onEnd()
  }

  const handleAddButton = async () => {
    if (!newLabel.trim()) return
    const updated = [...buttons, { id: crypto.randomUUID(), label: newLabel.trim(), color: newColor }]
    await updateSessionButtons(sessionId, updated)
    setNewLabel('')
    setShowAddButton(false)
  }

  const handleReaction = async (emoji) => {
    await addReaction(sessionId, {
      emoji,
      from: userName,
      timestamp: getElapsed(),
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const num = parseInt(e.key)
      if (num >= 1 && num <= buttons.length) { e.preventDefault(); handleClick(buttons[num - 1]); return }
      if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); handleUndo(); return }
      if (e.key === ' ' && role === 'host') { e.preventDefault(); onPauseToggle(); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [buttons, handleClick, handleUndo, onPauseToggle, role])

  const tagCounts = {}
  tags.forEach(t => { tagCounts[t.label] = (tagCounts[t.label] || 0) + 1 })

  // Filtered log
  const filteredTags = logFilter === 'all'
    ? tags
    : tags.filter(t => t.taggedBy === logFilter)

  // Unique taggers for filter
  const taggers = [...new Set(tags.map(t => t.taggedBy).filter(Boolean))]

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        onLogoClick={() => setShowLeaveConfirm(true)}
        left={
          <div className="text-center">
            {sessionData?.projectName && <p className="text-xs text-gray-400 leading-none">{sessionData.projectName}</p>}
            <p className="text-xs font-medium text-gray-600">{sessionData?.name}</p>
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500">{sessionData?.code}</span>
            <button onClick={() => navigator.clipboard.writeText(sessionData?.code || '')} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">Copy</button>
          </div>
        }
      />

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-4 flex flex-col" style={{ minHeight: 'calc(100vh - 57px)' }}>
      {/* Participants */}
      <div className="flex items-center justify-center gap-1.5 mb-3 flex-wrap mt-2">
        {participants.map((p, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${p.role === 'host' ? 'bg-rose-100 text-rose-500' : 'bg-gray-100 text-gray-500'}`}>
            {p.name}{p.role === 'host' ? ' ★' : ''}
          </span>
        ))}
      </div>

      {/* Timer */}
      <div className="text-center my-4">
        <div className={`text-6xl font-mono font-light tabular-nums tracking-tight ${isPaused ? 'text-amber-500' : 'text-gray-800'}`}>
          {formatTime(elapsed)}
        </div>
        {isPaused && <p className="text-amber-500 text-xs mt-1 font-medium uppercase tracking-wide">Paused</p>}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2 mb-4">
        {role === 'host' && (
          <button onClick={onPauseToggle}
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${isPaused ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
        )}
        <button onClick={handleUndo} disabled={tags.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
          ↩ Undo
        </button>
      </div>

      {/* Reactions bar */}
      <div className="flex justify-center gap-2 mb-3">
        {REACTIONS.map(emoji => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="text-xl w-11 h-11 rounded-xl bg-white border border-gray-100 hover:bg-gray-50 active:scale-90 transition-all cursor-pointer shadow-sm"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Floating reactions */}
      <div className="fixed bottom-24 right-4 flex flex-col-reverse gap-1 pointer-events-none z-50">
        {floatingReactions.map(r => (
          <div key={r.floatId} className="flex items-center gap-1 bg-white rounded-full px-3 py-1.5 shadow-md border border-gray-100 animate-bounce text-sm">
            <span className="text-lg">{r.emoji}</span>
            <span className="text-xs text-gray-500">{r.from}</span>
          </div>
        ))}
      </div>

      {/* Tag buttons grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
        {buttons.map((btn, i) => (
          <button
            key={btn.id}
            onClick={() => handleClick(btn)}
            disabled={isPaused}
            className={`relative flex items-center gap-3 px-4 py-5 rounded-2xl text-left transition-all cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed select-none
              ${lastClicked === btn.id ? 'scale-95' : 'active:scale-95'}`}
            style={{ backgroundColor: btn.color + '15', border: `2px solid ${btn.color}35` }}
          >
            <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: btn.color }} />
            <span className="font-medium text-gray-700 text-sm flex-1 leading-tight">{btn.label}</span>
            {i < 9 && <span className="text-xs font-mono text-gray-300">{i + 1}</span>}
            {tagCounts[btn.label] > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-semibold"
                style={{ backgroundColor: btn.color }}>
                {tagCounts[btn.label]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Add tag button — proper button, not a tiny link */}
      {!showAddButton ? (
        <button
          onClick={() => { setShowAddButton(true); setTimeout(() => addInputRef.current?.focus(), 50) }}
          className="w-full py-3 mb-4 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 hover:bg-white transition-all cursor-pointer active:scale-98"
        >
          + Add tag button
        </button>
      ) : (
        <div className="mb-4 bg-white rounded-xl border border-gray-200 p-3">
          <p className="text-xs text-gray-400 mb-2">New tag button</p>
          <div className="flex gap-1 mb-3">
            {COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={`flex-1 h-8 rounded-lg cursor-pointer transition-transform active:scale-95 ${newColor === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <input
            ref={addInputRef}
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddButton(); if (e.key === 'Escape') setShowAddButton(false) }}
            placeholder="Tag name..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 mb-2"
          />
          <div className="flex gap-2">
            <button onClick={handleAddButton} disabled={!newLabel.trim()}
              className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-40">
              Add button
            </button>
            <button onClick={() => { setShowAddButton(false); setNewLabel('') }}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tag log — collapsible with participant filter */}
      {tags.length > 0 && (
        <div className="mb-4 border border-gray-200 rounded-xl bg-white overflow-hidden">
          {/* Log header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowLog(v => !v)}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 cursor-pointer flex items-center gap-1">
                {showLog ? '▾' : '▸'} {tags.length} tag{tags.length !== 1 ? 's' : ''}
              </button>
            </div>
            {/* Participant filter — only show if multiple taggers */}
            {taggers.length > 1 && showLog && (
              <div className="flex gap-1">
                <button onClick={() => setLogFilter('all')}
                  className={`text-xs px-2 py-0.5 rounded-full cursor-pointer ${logFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  All
                </button>
                {taggers.map(name => (
                  <button key={name} onClick={() => setLogFilter(name)}
                    className={`text-xs px-2 py-0.5 rounded-full cursor-pointer ${logFilter === name ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Log entries */}
          {showLog && (
            <div className="max-h-44 overflow-y-auto">
              {[...filteredTags].reverse().map(tag => (
                <div key={tag.id} className="flex items-center gap-2 px-4 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-mono text-gray-400 w-14 shrink-0">{formatTime(tag.timestamp)}</span>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm text-gray-600 flex-1">{tag.label}</span>
                  {tag.taggedBy && tag.taggedBy !== userName && (
                    <span className="text-xs text-gray-300">{tag.taggedBy}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leave session confirmation modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Leave session?</h2>
            <p className="text-sm text-gray-500 mb-1">The session will keep running. You can rejoin from the home screen.</p>
            <p className="text-xs text-gray-400 mb-6">Session code: <span className="font-mono font-medium">{sessionData?.code}</span></p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium cursor-pointer hover:bg-gray-200 transition-colors"
              >
                Stay
              </button>
              <button
                onClick={() => { setShowLeaveConfirm(false); onGoHome() }}
                className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-medium cursor-pointer hover:bg-gray-900 transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End session confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">End session?</h2>
            <p className="text-sm text-gray-500 mb-6">This will stop the timer and close the session for all participants.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium cursor-pointer hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEndConfirmed}
                className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-medium cursor-pointer hover:bg-gray-900 transition-colors"
              >
                End session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-3 pb-4 mt-auto">
        <div className="flex-1 text-center text-xs text-gray-300 self-center hidden sm:block">
          1–{Math.min(buttons.length, 9)} tag · Z undo{role === 'host' ? ' · Space pause' : ''}
        </div>
        {role === 'host' && (
          <button onClick={() => setShowEndConfirm(true)}
            className="px-8 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors cursor-pointer">
            End session
          </button>
        )}
      </div>
    </div>
    </div>
  )
}
