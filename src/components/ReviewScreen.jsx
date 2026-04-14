import { useState, useMemo } from 'react'
import { formatTime, parseTranscript } from '../utils/time'

export default function ReviewScreen({ session, tags, onUpdateNote, onNewSession }) {
  const [transcript, setTranscript] = useState(null)
  const [filter, setFilter] = useState('all')

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseTranscript(ev.target.result)
      setTranscript(parsed)
    }
    reader.readAsText(file)
  }

  const filteredTags = useMemo(() => {
    if (filter === 'all') return tags
    return tags.filter(t => t.label === filter)
  }, [tags, filter])

  const uniqueLabels = [...new Set(tags.map(t => t.label))]

  // Merge tags into transcript lines by finding the closest timestamp
  const mergedView = useMemo(() => {
    if (!transcript) return null
    return transcript.map(line => {
      const lineTags = filteredTags.filter(tag => {
        const diff = Math.abs(tag.timestamp - line.timestampMs)
        return diff < 60000 // within 1 minute
      })
      return { ...line, tags: lineTags }
    })
  }, [transcript, filteredTags])

  const handleExport = () => {
    let csv = 'Timestamp,Tag,Note\n'
    tags.forEach(t => {
      csv += `${formatTime(t.timestamp)},${t.label},"${t.note || ''}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${session.name.replace(/\s+/g, '_')}_tags.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{session.name}</h1>
          {session.participant && (
            <p className="text-sm text-gray-400">{session.participant}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Export CSV
          </button>
          <button
            onClick={onNewSession}
            className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors cursor-pointer"
          >
            New session
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-sm rounded-full cursor-pointer ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All ({tags.length})
        </button>
        {uniqueLabels.map(label => {
          const count = tags.filter(t => t.label === label).length
          const color = tags.find(t => t.label === label)?.color
          return (
            <button
              key={label}
              onClick={() => setFilter(label)}
              className={`px-3 py-1 text-sm rounded-full flex items-center gap-1.5 cursor-pointer ${filter === label ? 'ring-2 ring-offset-1' : 'hover:opacity-80'}`}
              style={{
                backgroundColor: color + '20',
                color: color,
                ...(filter === label ? { ringColor: color } : {}),
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {label} ({count})
            </button>
          )
        })}
      </div>

      {/* Transcript upload */}
      {!transcript && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-6">
          <p className="text-gray-500 mb-3">Import Google Meet transcript (.txt)</p>
          <label className="inline-block px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer text-sm">
            Choose file
            <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      )}

      {/* Merged transcript + tags view */}
      {mergedView && (
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden mb-6">
          {mergedView.map((line, i) => (
            <div
              key={i}
              className={`px-4 py-3 border-b border-gray-50 last:border-0 ${line.tags.length > 0 ? 'bg-amber-50/50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono text-gray-400 w-14 shrink-0 pt-0.5">
                  {line.timeLabel}
                </span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-600">{line.speaker}: </span>
                  <span className="text-sm text-gray-700">{line.text}</span>
                  {line.tags.length > 0 && (
                    <div className="flex gap-1.5 mt-1.5">
                      {line.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                          style={{ backgroundColor: tag.color + '20', color: tag.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tags-only list (always visible) */}
      {!transcript && (
        <div className="space-y-2">
          {filteredTags.map(tag => (
            <div key={tag.id} className="flex items-start gap-3 bg-white rounded-lg px-4 py-3 border border-gray-100">
              <span className="text-sm font-mono text-gray-400 w-16 shrink-0 pt-0.5">
                {formatTime(tag.timestamp)}
              </span>
              <span
                className="w-3 h-3 rounded-full shrink-0 mt-1"
                style={{ backgroundColor: tag.color }}
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">{tag.label}</span>
                <input
                  type="text"
                  placeholder="Add a note..."
                  value={tag.note}
                  onChange={e => onUpdateNote(tag.id, e.target.value)}
                  className="block w-full mt-1 text-sm text-gray-500 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-gray-300 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
