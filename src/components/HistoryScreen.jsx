import { formatTime } from '../utils/time'

export default function HistoryScreen({ sessions, onLoad, onDelete, onBack }) {
  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-gray-800">Past sessions</h1>
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer"
        >
          ← Back
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No sessions yet</p>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <div
              key={s.id}
              className="bg-white rounded-lg border border-gray-100 px-4 py-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-gray-700">{s.name}</h3>
                  {s.participant && (
                    <p className="text-xs text-gray-400">{s.participant}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(s.startedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                <span>{s.tags?.length || 0} tags</span>
                <span>{s.participants?.length || 1} participant{(s.participants?.length || 1) !== 1 ? 's' : ''}</span>
                {s.endedAt && s.startedAt && (
                  <span>Duration: {formatTime(s.endedAt - s.startedAt)}</span>
                )}
              </div>
              {/* Tag summary pills */}
              {s.tags && s.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {Object.entries(
                    s.tags.reduce((acc, t) => {
                      acc[t.label] = { count: (acc[t.label]?.count || 0) + 1, color: t.color }
                      return acc
                    }, {})
                  ).map(([label, { count, color }]) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{ backgroundColor: color + '20', color }}
                    >
                      {label} ({count})
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => onLoad(s)}
                  className="flex-1 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Review
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this session?')) onDelete(s.id)
                  }}
                  className="px-3 py-2 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
