import { useState, useEffect, useRef, useCallback } from 'react'
import { formatTime } from '../utils/time'

export default function SessionScreen({
  session, buttons, tags, onTag, onUndo, onEnd,
  isPaused, pauseOffset, pausedAt, onPauseToggle,
}) {
  const [elapsed, setElapsed] = useState(0)
  const [lastClicked, setLastClicked] = useState(null)
  const [quickNote, setQuickNote] = useState({ show: false, tagId: null, text: '' })
  const intervalRef = useRef(null)
  const noteInputRef = useRef(null)

  // Timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (isPaused) return
      const now = Date.now()
      setElapsed(now - session.startedAt - pauseOffset)
    }, 100)
    return () => clearInterval(intervalRef.current)
  }, [session.startedAt, isPaused, pauseOffset])

  // When paused, freeze the display
  useEffect(() => {
    if (isPaused && pausedAt) {
      setElapsed(pausedAt - session.startedAt - pauseOffset)
    }
  }, [isPaused, pausedAt, session.startedAt, pauseOffset])

  const getElapsed = useCallback(() => {
    if (isPaused && pausedAt) return pausedAt - session.startedAt - pauseOffset
    return Date.now() - session.startedAt - pauseOffset
  }, [isPaused, pausedAt, session.startedAt, pauseOffset])

  const handleClick = useCallback((btn) => {
    if (isPaused) return
    const ts = getElapsed()
    onTag(btn, ts)
    setLastClicked(btn.id)
    setTimeout(() => setLastClicked(null), 300)
  }, [isPaused, getElapsed, onTag])

  // Keyboard shortcuts: 1-9 for buttons, Z for undo, Space for pause
  useEffect(() => {
    const handler = (e) => {
      // Don't capture if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      const num = parseInt(e.key)
      if (num >= 1 && num <= buttons.length) {
        e.preventDefault()
        handleClick(buttons[num - 1])
        return
      }
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault()
        onUndo()
        return
      }
      if (e.key === ' ') {
        e.preventDefault()
        onPauseToggle()
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [buttons, handleClick, onUndo, onPauseToggle])

  // Tag counts per button
  const tagCounts = {}
  tags.forEach(t => { tagCounts[t.label] = (tagCounts[t.label] || 0) + 1 })

  const openQuickNote = (tagId) => {
    setQuickNote({ show: true, tagId, text: '' })
    setTimeout(() => noteInputRef.current?.focus(), 50)
  }

  const saveQuickNote = () => {
    if (quickNote.tagId && quickNote.text) {
      // Find the tag and update its note directly in the tags array via parent
      const tag = tags.find(t => t.id === quickNote.tagId)
      if (tag) tag.note = quickNote.text
    }
    setQuickNote({ show: false, tagId: null, text: '' })
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col min-h-screen">
      <div className="text-center mb-2">
        <p className="text-sm text-gray-500">{session.name}</p>
        {session.participant && <p className="text-xs text-gray-400">{session.participant}</p>}
      </div>

      {/* Timer */}
      <div className="text-center my-6 sm:my-8">
        <div className={`text-5xl sm:text-6xl font-mono font-light tabular-nums ${isPaused ? 'text-amber-500' : 'text-gray-800'}`}>
          {formatTime(elapsed)}
        </div>
        {isPaused && <p className="text-amber-500 text-sm mt-1">Paused</p>}
      </div>

      {/* Controls row */}
      <div className="flex justify-center gap-3 mb-6">
        <button
          onClick={onPauseToggle}
          className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
            isPaused
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          }`}
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button
          onClick={onUndo}
          disabled={tags.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          ↩ Undo
        </button>
      </div>

      {/* Tag buttons — big touch targets for mobile */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1 content-start mb-6">
        {buttons.map((btn, i) => (
          <button
            key={btn.id}
            onClick={() => handleClick(btn)}
            disabled={isPaused}
            className={`relative flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-5 sm:py-4 rounded-xl text-left transition-all cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
              ${lastClicked === btn.id ? 'scale-95' : 'hover:scale-[1.02] active:scale-95'}`}
            style={{
              backgroundColor: btn.color + '18',
              border: `2px solid ${btn.color}40`,
            }}
          >
            <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: btn.color }} />
            <span className="font-medium text-gray-700 text-sm sm:text-base flex-1">{btn.label}</span>
            <span className="text-xs font-mono text-gray-400">{i + 1}</span>
            {tagCounts[btn.label] > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-medium"
                style={{ backgroundColor: btn.color }}
              >
                {tagCounts[btn.label]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Quick note modal */}
      {quickNote.show && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm">
            <p className="text-sm text-gray-500 mb-2">Quick note</p>
            <input
              ref={noteInputRef}
              type="text"
              value={quickNote.text}
              onChange={e => setQuickNote(prev => ({ ...prev, text: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && saveQuickNote()}
              placeholder="What happened?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={saveQuickNote} className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-sm cursor-pointer">Save</button>
              <button onClick={() => setQuickNote({ show: false, tagId: null, text: '' })} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm cursor-pointer">Skip</button>
            </div>
          </div>
        </div>
      )}

      {/* Live tag feed */}
      {tags.length > 0 && (
        <div className="mb-6 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
          {[...tags].reverse().map(tag => (
            <div key={tag.id} className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs font-mono text-gray-400 w-16 shrink-0">{formatTime(tag.timestamp)}</span>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="text-sm text-gray-600 flex-1">{tag.label}</span>
              <button
                onClick={() => openQuickNote(tag.id)}
                className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {tag.note ? '📝' : '+ note'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-3 pb-4">
        <div className="flex-1 text-center text-sm text-gray-400 self-center">
          {tags.length} tag{tags.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={onEnd}
          className="px-8 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors cursor-pointer"
        >
          End session
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="text-center text-xs text-gray-300 pb-2">
        <span className="hidden sm:inline">1–{buttons.length} tag · Z undo · Space pause</span>
      </div>
    </div>
  )
}
