import { useMemo } from 'react'
import { formatTime } from '../utils/time'

export default function SummaryScreen({ session, tags, participants, onReview, onNewSession, onGoHome, onGoToProject }) {
  const duration = session.endedAt && session.startedAt
    ? session.endedAt - session.startedAt
    : null

  // Tag breakdown by label
  const tagBreakdown = useMemo(() => {
    const map = {}
    tags.forEach(t => {
      if (!map[t.label]) map[t.label] = { label: t.label, color: t.color, count: 0, timestamps: [] }
      map[t.label].count++
      map[t.label].timestamps.push(t.timestamp)
    })
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [tags])

  // Tags by participant/tagger
  const byTagger = useMemo(() => {
    const map = {}
    tags.forEach(t => {
      const name = t.taggedBy || 'Unknown'
      if (!map[name]) map[name] = 0
      map[name]++
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [tags])

  // Most active moments — find 1-minute windows with most tags
  const hotMoments = useMemo(() => {
    if (tags.length < 2) return []
    const windowMs = 60000
    const moments = []
    tags.forEach(anchor => {
      const inWindow = tags.filter(t =>
        t.timestamp >= anchor.timestamp && t.timestamp < anchor.timestamp + windowMs
      )
      if (inWindow.length >= 2) {
        moments.push({ timestamp: anchor.timestamp, count: inWindow.length, tags: inWindow })
      }
    })
    // Deduplicate overlapping windows, keep highest count
    const sorted = moments.sort((a, b) => b.count - a.count)
    const deduped = []
    sorted.forEach(m => {
      if (!deduped.some(d => Math.abs(d.timestamp - m.timestamp) < 30000)) {
        deduped.push(m)
      }
    })
    return deduped.slice(0, 3)
  }, [tags])

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      {/* Logo nav */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <button onClick={onGoHome} className="font-semibold text-gray-800 hover:text-rose-500 transition-colors cursor-pointer">.clickr</button>
        {session.projectName && (
          <>
            <span>›</span>
            <button onClick={onGoToProject} className="hover:text-gray-700 cursor-pointer">{session.projectName}</button>
          </>
        )}
      </div>

      <div className="text-center mb-8">
        <p className="text-xs text-gray-400 mb-1">{session.projectName}</p>
        <h1 className="text-2xl font-semibold text-gray-800">{session.name}</h1>
        <p className="text-sm text-gray-400 mt-1">Session complete</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-semibold text-gray-800">{tags.length}</p>
          <p className="text-xs text-gray-400 mt-1">Tags</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-semibold text-gray-800">{participants.length}</p>
          <p className="text-xs text-gray-400 mt-1">Participants</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-semibold text-gray-800">{duration ? formatTime(duration) : '—'}</p>
          <p className="text-xs text-gray-400 mt-1">Duration</p>
        </div>
      </div>

      {/* Tag breakdown */}
      {tagBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Tag breakdown</h2>
          <div className="space-y-2">
            {tagBreakdown.map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.count / tagBreakdown[0].count) * 100}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-500 w-4 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hot moments */}
      {hotMoments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Most active moments</h2>
          <div className="space-y-2">
            {hotMoments.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-400 w-14 shrink-0">{formatTime(m.timestamp)}</span>
                <div className="flex gap-1 flex-wrap flex-1">
                  {m.tags.map(t => (
                    <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{ backgroundColor: t.color + '20', color: t.color }}>
                      {t.label}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-gray-400">{m.count} tags</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By tagger */}
      {byTagger.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Tags by person</h2>
          <div className="space-y-1.5">
            {byTagger.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{name}</span>
                <span className="text-gray-400">{count} tag{count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onReview}
          className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors cursor-pointer"
        >
          Review session
        </button>
        <button
          onClick={onNewSession}
          className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
        >
          New session
        </button>
      </div>
    </div>
  )
}
