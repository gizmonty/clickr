import { useState, useMemo, useRef } from 'react'
import { formatTime, parseTranscript } from '../utils/time'

export default function ReviewScreen({ session, tags, participants, onUpdateNote, onNewSession }) {
  const [transcript, setTranscript] = useState(null)
  const [filter, setFilter] = useState('all')
  const [offsetSec, setOffsetSec] = useState(0)
  const fileInputRef = useRef(null)

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
  const offsetMs = offsetSec * 1000

  // Smarter matching: find the closest transcript line for each tag
  const mergedView = useMemo(() => {
    if (!transcript) return null
    const lineTagMap = new Map()

    filteredTags.forEach(tag => {
      const adjustedTs = tag.timestamp + offsetMs
      let closestIdx = 0
      let closestDiff = Infinity

      transcript.forEach((line, idx) => {
        const diff = Math.abs(adjustedTs - line.timestampMs)
        if (diff < closestDiff) {
          closestDiff = diff
          closestIdx = idx
        }
      })

      if (closestDiff < 120000) {
        if (!lineTagMap.has(closestIdx)) lineTagMap.set(closestIdx, [])
        lineTagMap.get(closestIdx).push(tag)
      }
    })

    return transcript.map((line, i) => ({
      ...line,
      tags: lineTagMap.get(i) || [],
    }))
  }, [transcript, filteredTags, offsetMs])

  const safeName = () => session.name.replace(/[^a-zA-Z0-9]/g, '_')

  const downloadBlob = (content, filename, type) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    let csv = 'Timestamp,Tag,Note\n'
    tags.forEach(t => {
      csv += `${formatTime(t.timestamp)},"${t.label}","${(t.note || '').replace(/"/g, '""')}"\n`
    })
    downloadBlob(csv, `${safeName()}_tags.csv`, 'text/csv')
  }

  const handleExportHTML = () => {
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${session.name}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333}
.tag{display:inline-block;padding:2px 8px;border-radius:12px;font-size:12px;margin:2px}
.line{padding:8px 0;border-bottom:1px solid #eee}.ts{color:#999;font-family:monospace;font-size:13px}
h1{font-size:22px}h2{font-size:16px;color:#666}</style></head><body>
<h1>${session.name}</h1>${session.participant ? `<h2>${session.participant}</h2>` : ''}
<h2>${tags.length} tags logged</h2><hr>`

    if (mergedView) {
      mergedView.forEach(line => {
        html += `<div class="line"><span class="ts">${line.timeLabel}</span> <strong>${line.speaker}:</strong> ${line.text}`
        line.tags.forEach(tag => {
          html += ` <span class="tag" style="background:${tag.color}20;color:${tag.color}">${tag.label}</span>`
        })
        html += `</div>`
      })
    } else {
      tags.forEach(t => {
        html += `<div class="line"><span class="ts">${formatTime(t.timestamp)}</span> <span class="tag" style="background:${t.color}20;color:${t.color}">${t.label}</span>${t.note ? ` — ${t.note}` : ''}</div>`
      })
    }
    html += `</body></html>`
    downloadBlob(html, `${safeName()}_report.html`, 'text/html')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          {session.projectName && <p className="text-xs text-gray-400 mb-0.5">{session.projectName}</p>}
          <h1 className="text-xl font-semibold text-gray-800">{session.name}</h1>
          {session.participant && <p className="text-sm text-gray-400">{session.participant}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExportCSV} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">CSV</button>
          <button onClick={handleExportHTML} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">HTML Report</button>
          <button onClick={onNewSession} className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors cursor-pointer">New session</button>
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
              style={{ backgroundColor: color + '20', color }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {label} ({count})
            </button>
          )
        })}
      </div>

      {/* Transcript upload or offset control */}
      {!transcript ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-6">
          <p className="text-gray-500 mb-1">Import transcript</p>
          <p className="text-gray-400 text-xs mb-3">Supports Google Meet .txt, .srt, .sbv</p>
          <label className="inline-block px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer text-sm">
            Choose file
            <input ref={fileInputRef} type="file" accept=".txt,.srt,.sbv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      ) : (
        <div className="flex items-center gap-4 mb-4 bg-white rounded-lg px-4 py-3 border border-gray-100">
          <span className="text-sm text-gray-500 shrink-0">Offset:</span>
          <input
            type="range" min={-120} max={120} value={offsetSec}
            onChange={e => setOffsetSec(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-mono text-gray-600 w-16 text-right">
            {offsetSec >= 0 ? '+' : ''}{offsetSec}s
          </span>
          <button
            onClick={() => { setTranscript(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            Remove
          </button>
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
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
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

      {/* Participants list */}
      {participants && participants.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-400">Participants:</span>
          {participants.map((p, i) => (
            <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${p.role === 'host' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* Tags-only list (when no transcript) */}
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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{tag.label}</span>
                  {tag.taggedBy && <span className="text-xs text-gray-300">by {tag.taggedBy}</span>}
                  {tag.participant && <span className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">@{tag.participant}</span>}
                </div>
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
