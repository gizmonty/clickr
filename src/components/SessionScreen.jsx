import { useState, useEffect, useRef } from 'react'
import { formatTime } from '../utils/time'

export default function SessionScreen({ session, buttons, tags, onTag, onEnd }) {
  const [elapsed, setElapsed] = useState(0)
  const [lastClicked, setLastClicked] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - session.startedAt)
    }, 100)
    return () => clearInterval(intervalRef.current)
  }, [session.startedAt])

  const handleClick = (btn) => {
    onTag(btn, elapsed)
    setLastClicked(btn.id)
    setTimeout(() => setLastClicked(null), 300)
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8 flex flex-col min-h-screen">
      <div className="text-center mb-2">
        <p className="text-sm text-gray-500">{session.name}</p>
        {session.participant && (
          <p className="text-xs text-gray-400">{session.participant}</p>
        )}
      </div>

      <div className="text-center my-8">
        <div className="text-6xl font-mono font-light text-gray-800 tabular-nums">
          {formatTime(elapsed)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 content-start mb-6">
        {buttons.map(btn => (
          <button
            key={btn.id}
            onClick={() => handleClick(btn)}
            className={`flex items-center gap-3 px-5 py-4 rounded-xl text-left transition-all cursor-pointer
              ${lastClicked === btn.id ? 'scale-95' : 'hover:scale-[1.02]'}`}
            style={{
              backgroundColor: btn.color + '18',
              border: `2px solid ${btn.color}40`,
            }}
          >
            <span
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: btn.color }}
            />
            <span className="font-medium text-gray-700">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Live tag feed */}
      {tags.length > 0 && (
        <div className="mb-6 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
          {[...tags].reverse().map(tag => (
            <div key={tag.id} className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs font-mono text-gray-400 w-16 shrink-0">
                {formatTime(tag.timestamp)}
              </span>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="text-sm text-gray-600">{tag.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1 text-center text-sm text-gray-400 self-center">
          {tags.length} tag{tags.length !== 1 ? 's' : ''} logged
        </div>
        <button
          onClick={onEnd}
          className="px-8 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors cursor-pointer"
        >
          End session
        </button>
      </div>
    </div>
  )
}
