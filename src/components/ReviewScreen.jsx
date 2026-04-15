import { useState, useMemo, useRef } from 'react'
import { formatTime, parseTranscript } from '../utils/time'
import TopBar from './TopBar'

export default function ReviewScreen({ session, tags, participants, onUpdateNote, onNewSession, onLogoClick, onGoToProject }) {
  const [transcript, setTranscript] = useState(null)
  const [filter, setFilter] = useState('all')
  const [offsetSec, setOffsetSec] = useState(0)
  const [autoMatched, setAutoMatched] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseTranscript(ev.target.result)
      setTranscript(parsed)
      setAutoMatched(false)
      // Auto-match: transcript timestamps are relative to recording start.
      // session.startedAt is when the clicker started (ms since epoch).
      // If transcript has absolute wall-clock timestamps we can't auto-align,
      // but Google Meet transcripts use relative timestamps from recording start.
      // So offset = 0 is the best default — both start at 0.
      // However if the host started the clicker before/after the recording,
      // we detect this by finding the first tag and the first transcript line
      // and computing the likely offset.
      if (parsed.length > 0 && tags.length > 0) {
        // Find the earliest tag
        const firstTag = [...tags].sort((a, b) => a.timestamp - b.timestamp)[0]
        // Find the closest transcript line to that tag
        let closestDiff = Infinity
        let closestLineTs = 0
        parsed.forEach(line => {
          const diff = Math.abs(firstTag.timestamp - line.timestampMs)
          if (diff < closestDiff) { closestDiff = diff; closestLineTs = line.timestampMs }
        })
        // If the closest match is within 5 minutes, auto-set offset
        if (closestDiff < 300000) {
          const autoOffset = Math.round((firstTag.timestamp - closestLineTs) / 1000)
          setOffsetSec(autoOffset)
          setAutoMatched(true)
        }
      }
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
    // Header
    const sessionInfo = [
      `Project,${session.projectName || ''}`,
      `Session,${session.name}`,
      `Date,${new Date(session.startedAt).toLocaleDateString()}`,
      `Participants,${participants.map(p => p.name).join(' | ')}`,
      `Total tags,${tags.length}`,
      '',
      'Timestamp,Tag,Tagged by,Transcript context',
    ]

    const rows = tags.map(t => {
      // Find matching transcript line if available
      let context = ''
      if (mergedView) {
        const offsetMs = offsetSec * 1000
        let closestDiff = Infinity
        mergedView.forEach(line => {
          const diff = Math.abs((t.timestamp + offsetMs) - line.timestampMs)
          if (diff < closestDiff) { closestDiff = diff; context = `${line.speaker}: ${line.text}` }
        })
        if (closestDiff > 120000) context = ''
      }
      return `${formatTime(t.timestamp)},"${t.label}","${t.taggedBy || ''}","${context.replace(/"/g, '""')}"`
    })

    downloadBlob([...sessionInfo, ...rows].join('\n'), `${safeName()}_tags.csv`, 'text/csv')
  }

  const handleExportHTML = () => {
    const participantList = participants.map(p =>
      `<span class="pill ${p.role}">${p.name}${p.role === 'host' ? ' ★' : ''}</span>`
    ).join(' ')

    // Tag breakdown for summary
    const breakdown = {}
    tags.forEach(t => { breakdown[t.label] = (breakdown[t.label] || 0) + 1 })
    const breakdownRows = Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => {
        const color = tags.find(t => t.label === label)?.color || '#999'
        return `<span class="tag" style="background:${color}20;color:${color}">${label} (${count})</span>`
      }).join(' ')

    // Per-person breakdown
    const byPerson = {}
    tags.forEach(t => { byPerson[t.taggedBy || 'Unknown'] = (byPerson[t.taggedBy || 'Unknown'] || 0) + 1 })
    const personRows = Object.entries(byPerson)
      .map(([name, count]) => `<tr><td>${name}</td><td>${count}</td></tr>`).join('')

    let html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${session.name} — .clicker report</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#333;line-height:1.5}
  h1{font-size:22px;font-weight:600;margin:0 0 4px}
  h2{font-size:14px;font-weight:600;color:#666;margin:24px 0 10px;text-transform:uppercase;letter-spacing:.05em}
  .meta{color:#999;font-size:13px;margin-bottom:20px}
  .pill{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;margin:2px;background:#f3f4f6;color:#555}
  .pill.host{background:#fee2e2;color:#e05252}
  .tag{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;margin:2px}
  .stats{display:flex;gap:16px;margin:16px 0}
  .stat{background:#f9fafb;border:1px solid #eee;border-radius:10px;padding:12px 20px;text-align:center}
  .stat-n{font-size:24px;font-weight:600;color:#111}
  .stat-l{font-size:12px;color:#999;margin-top:2px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;padding:8px 12px;background:#f9fafb;border-bottom:2px solid #eee;font-weight:600;color:#555}
  td{padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top}
  tr:hover td{background:#fafafa}
  .ts{font-family:monospace;color:#999;white-space:nowrap}
  .context{color:#666;font-size:12px;margin-top:3px}
  .tagger{color:#aaa;font-size:12px}
  hr{border:none;border-top:1px solid #eee;margin:24px 0}
</style></head><body>

<p class="meta">${session.projectName ? `${session.projectName} · ` : ''}${new Date(session.startedAt).toLocaleDateString()} · ${participants.length} participant${participants.length !== 1 ? 's' : ''}</p>
<h1>${session.name}</h1>
<div style="margin:8px 0 16px">${participantList}</div>

<div class="stats">
  <div class="stat"><div class="stat-n">${tags.length}</div><div class="stat-l">Tags</div></div>
  <div class="stat"><div class="stat-n">${participants.length}</div><div class="stat-l">Participants</div></div>
  ${session.endedAt ? `<div class="stat"><div class="stat-n">${formatTime(session.endedAt - session.startedAt)}</div><div class="stat-l">Duration</div></div>` : ''}
</div>

<h2>Tag breakdown</h2>
<div style="margin-bottom:16px">${breakdownRows}</div>

${Object.keys(byPerson).length > 1 ? `<h2>Tags by person</h2>
<table><tr><th>Name</th><th>Tags</th></tr>${personRows}</table>` : ''}

<hr>
<h2>All tags${mergedView ? ' with transcript context' : ''}</h2>
<table>
  <tr><th>Time</th><th>Tag</th><th>Tagged by</th>${mergedView ? '<th>Transcript</th>' : ''}</tr>`

    tags.forEach(t => {
      let context = ''
      if (mergedView) {
        const offsetMs = offsetSec * 1000
        let closestDiff = Infinity
        mergedView.forEach(line => {
          const diff = Math.abs((t.timestamp + offsetMs) - line.timestampMs)
          if (diff < closestDiff) { closestDiff = diff; context = `<strong>${line.speaker}:</strong> ${line.text}` }
        })
        if (closestDiff > 120000) context = ''
      }
      html += `<tr>
        <td class="ts">${formatTime(t.timestamp)}</td>
        <td><span class="tag" style="background:${t.color}20;color:${t.color}">${t.label}</span></td>
        <td class="tagger">${t.taggedBy || ''}</td>
        ${mergedView ? `<td class="context">${context}</td>` : ''}
      </tr>`
    })

    html += `</table></body></html>`
    downloadBlob(html, `${safeName()}_report.html`, 'text/html')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        onLogoClick={onLogoClick}
        left={
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            {session.projectName && (
              <>
                <button onClick={onGoToProject} className="hover:text-gray-700 cursor-pointer truncate max-w-[120px]">
                  {session.projectName}
                </button>
                <span>›</span>
              </>
            )}
            <span className="text-gray-600 truncate max-w-[120px]">{session.name}</span>
          </div>
        }
        right={
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">CSV</button>
            <button onClick={handleExportHTML} className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">HTML</button>
          </div>
        }
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Session header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">{session.name}</h1>
            {session.notes && <p className="text-sm text-gray-400 mt-1">{session.notes}</p>}
          </div>
          <button onClick={onNewSession} className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors cursor-pointer shrink-0 ml-4">
            New session
          </button>
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
          <p className="text-gray-400 text-xs mb-3">Supports Google Meet .txt, .srt, .sbv · timestamps auto-matched</p>
          <label className="inline-block px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer text-sm">
            Choose file
            <input ref={fileInputRef} type="file" accept=".txt,.srt,.sbv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      ) : (
        <div className="flex items-center gap-4 mb-4 bg-white rounded-lg px-4 py-3 border border-gray-100">
          <div className="flex flex-col shrink-0">
            <span className="text-sm text-gray-500">Offset</span>
            {autoMatched && <span className="text-xs text-green-500">auto-matched</span>}
          </div>
          <input
            type="range" min={-120} max={120} value={offsetSec}
            onChange={e => { setOffsetSec(Number(e.target.value)); setAutoMatched(false) }}
            className="flex-1"
          />
          <span className="text-sm font-mono text-gray-600 w-16 text-right">
            {offsetSec >= 0 ? '+' : ''}{offsetSec}s
          </span>
          <button
            onClick={() => { setTranscript(null); setOffsetSec(0); setAutoMatched(false); if (fileInputRef.current) fileInputRef.current.value = '' }}
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
              <span className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: tag.color }} />
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
    </div>
  )
}
