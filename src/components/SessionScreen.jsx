import { useState, useEffect, useRef, useCallback } from 'react'
import { formatTime } from '../utils/time'
import { addTag, removeLastTag, endSession as endSessionDb, updateSessionButtons } from '../lib/sessions'

const COLORS = [
  '#c97070', '#5bb57a', '#c9a84e', '#5b8ec9',
  '#9b6ec9', '#c96e9b', '#e07850', '#6bc9b8',
]

export default function SessionScreen({
  sessionId, sessionData, userName, role,
  onEnd, isPaused, pauseOffset, pausedAt, onPauseToggle,
}) {
  const [elapsed, setElapsed] = useState(0)
  const [lastClicked, setLastClicked] = useState(null)
  const [showAddButton, setShowAddButton] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const intervalRef = useRef(null)
  const addInputRef = useRef(null)

  const buttons = sessionData?.buttons || []
  const tags = sessionData?.tags || []
  const participants = sessionData?.participants || []

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

  // Add new button mid-session
  const handleAddButton = async () => {
    if (!newLabel.trim()) return
    const updated = [...buttons, {
      id: crypto.randomUUID(),
      label: newLabel.trim(),
      color: newColor,
    }]
    await updateSessionButtons(sessionId, updated)
    setNewLabel('')
    setShowAddButton(false)
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

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col min-h-screen">
      {/* Header */}
      <div className="text-center mb-2">
        {sessionData?.projectName && (
          <p className="text-xs text-gray-400">{sessionData.projectName}</p>
        )}
        <p className="text-sm text-gray-500">{sessionData?.name}</p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
            {sessionData?.code}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(sessionData?.code || '')}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            Copy
          </button>
        </div>
        {sessionData?.notes && (
          <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto">{sessionData.notes}</p>
        )}
      </div>

      {/* Participants */}
      <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
        {participants.map((p, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${p.role === 'host' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>
            {p.name}{p.role === 'host' ? ' (host)' : ''}
          </span>
        ))}
      </div>

      {/* Timer */}
      <div className="text-center my-4 sm:my-6">
        <div className={`text-5xl sm:text-6xl font-mono font-light tabular-nums ${isPaused ? 'text-amber-500' : 'text-gray-800'}`}>
          {formatTime(elapsed)}
        </div>
        {isPaused && <p className="text-amber-500 text-sm mt-1">Paused</p>}
      </div>

      {/* Controls — pause/resume host only */}
      <div className="flex justify-center gap-3 mb-4">
        {role === 'host' && (
          <button
            onClick={onPauseToggle}
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              isPaused ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
        )}
        <button
          onClick={handleUndo}
          disabled={tags.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          ↩ Undo
        </button>
      </div>

      {/* Tag buttons grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 content-start mb-2">
        {buttons.map((btn, i) => (
          <button
            key={btn.id}
            onClick={() => handleClick(btn)}
            disabled={isPaused}
            className={`relative flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-5 sm:py-4 rounded-xl text-left transition-all cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
              ${lastClicked === btn.id ? 'scale-95' : 'hover:scale-[1.02] active:scale-95'}`}
            style={{ backgroundColor: btn.color + '18', border: `2px solid ${btn.color}40` }}
          >
            <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: btn.color }} />
            <span className="font-medium text-gray-700 text-sm sm:text-base flex-1">{btn.label}</span>
            {i < 9 && <span className="text-xs font-mono text-gray-400">{i + 1}</span>}
            {tagCounts[btn.label] > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-medium"
                style={{ backgroundColor: btn.color }}>
                {tagCounts[btn.label]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Add button inline */}
      {!showAddButton ? (
        <button
          onClick={() => { setShowAddButton(true); setTimeout(() => addInputRef.current?.focus(), 50) }}
          className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer mb-4 self-center"
        >
          + Add tag button
        </button>
      ) : (
        <div className="flex items-center gap-2 mb-4 bg-white rounded-lg px-3 py-2 border border-gray-200">
          <div className="flex gap-1 shrink-0">
            {COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={`w-4 h-4 rounded-full cursor-pointer ${newColor === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <input
            ref={addInputRef}
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddButton(); if (e.key === 'Escape') setShowAddButton(false) }}
            placeholder="Tag name"
            className="flex-1 text-sm px-2 py-1 border-none focus:outline-none"
          />
          <button onClick={handleAddButton} className="text-xs text-green-600 font-medium cursor-pointer">Add</button>
          <button onClick={() => setShowAddButton(false)} className="text-xs text-gray-400 cursor-pointer">Cancel</button>
        </div>
      )}

      {/* Live tag feed */}
      {tags.length > 0 && (
        <div className="mb-4 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
          {[...tags].reverse().map(tag => (
            <div key={tag.id} className="flex items-center gap-2 px-4 py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs font-mono text-gray-400 w-14 shrink-0">{formatTime(tag.timestamp)}</span>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="text-sm text-gray-600 flex-1">{tag.label}</span>
              {tag.taggedBy && <span className="text-xs text-gray-300">{tag.taggedBy}</span>}
              {tag.participant && <span className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">@{tag.participant}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-3 pb-4">
        <div className="flex-1 text-center text-sm text-gray-400 self-center">
          {tags.length} tag{tags.length !== 1 ? 's' : ''}
        </div>
        {role === 'host' && (
          <button
            onClick={handleEnd}
            className="px-8 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors cursor-pointer"
          >
            End session
          </button>
        )}
      </div>

      <div className="text-center text-xs text-gray-300 pb-2">
        <span className="hidden sm:inline">1–{Math.min(buttons.length, 9)} tag · Z undo{role === 'host' ? ' · Space pause' : ''}</span>
      </div>
    </div>
  )
}
