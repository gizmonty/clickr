import { useState } from 'react'

export default function SetupScreen({ buttons, setButtons, onStart, onOpenHistory, historyCount }) {
  const [sessionName, setSessionName] = useState('')
  const [participant, setParticipant] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState('')

  const COLORS = [
    '#c97070', '#5bb57a', '#c9a84e', '#5b8ec9',
    '#9b6ec9', '#c96e9b', '#e07850', '#6bc9b8',
  ]

  const handleAdd = () => {
    const usedColors = buttons.map(b => b.color)
    const nextColor = COLORS.find(c => !usedColors.includes(c)) || COLORS[0]
    setButtons(prev => [...prev, {
      id: crypto.randomUUID(),
      label: 'New tag',
      color: nextColor,
    }])
  }

  const handleRemove = (id) => setButtons(prev => prev.filter(b => b.id !== id))

  const handleMoveUp = (index) => {
    if (index === 0) return
    setButtons(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  const handleMoveDown = (index) => {
    setButtons(prev => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  const startEdit = (btn) => { setEditingId(btn.id); setEditLabel(btn.label); setEditColor(btn.color) }
  const saveEdit = () => {
    setButtons(prev => prev.map(b => b.id === editingId ? { ...b, label: editLabel, color: editColor } : b))
    setEditingId(null)
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-semibold text-gray-800">.clicker</h1>
        <p className="text-gray-500 text-sm">UXR session tagging</p>
      </div>

      {historyCount > 0 && (
        <button
          onClick={onOpenHistory}
          className="w-full mb-6 py-3 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          📋 Past sessions ({historyCount})
        </button>
      )}

      <div className="space-y-5 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Session name</label>
          <input
            type="text"
            placeholder="e.g. P03 - Onboarding usability test"
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Participant (optional)</label>
          <input
            type="text"
            placeholder="e.g. P03"
            value={participant}
            onChange={e => setParticipant(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-600">Buttons ({buttons.length})</h2>
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

      <button
        onClick={() => onStart(sessionName || 'Untitled session', participant)}
        className="w-full py-4 bg-gradient-to-r from-rose-400 to-rose-500 text-white font-medium rounded-xl text-lg hover:from-rose-500 hover:to-rose-600 transition-all cursor-pointer"
      >
        Start session
      </button>
    </div>
  )
}
