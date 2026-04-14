import { useState } from 'react'
import { formatTime } from '../utils/time'

export default function HistoryScreen({ sessions, onLoad, onDelete, onBack }) {
  const [selectedProject, setSelectedProject] = useState(null)

  // Group sessions by project
  const projects = sessions.reduce((acc, s) => {
    const key = s.projectName || 'Uncategorized'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const projectNames = Object.keys(projects).sort()

  // Project list view
  if (!selectedProject) {
    return (
      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer mb-1 block">← Back</button>
            <h1 className="text-xl font-semibold text-gray-800">Past sessions</h1>
          </div>
        </div>

        {projectNames.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No sessions yet</p>
        ) : (
          <div className="space-y-3">
            {projectNames.map(name => {
              const projectSessions = projects[name]
              const totalTags = projectSessions.reduce((sum, s) => sum + (s.tags?.length || 0), 0)
              const latest = new Date(Math.max(...projectSessions.map(s => s.startedAt)))
              return (
                <button
                  key={name}
                  onClick={() => setSelectedProject(name)}
                  className="w-full bg-white rounded-xl border border-gray-100 px-5 py-4 text-left hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">{name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {projectSessions.length} session{projectSessions.length !== 1 ? 's' : ''} · {totalTags} tags
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{latest.toLocaleDateString()}</p>
                      <p className="text-gray-300 text-lg mt-1">›</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Session list within a project
  const projectSessions = projects[selectedProject] || []

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button onClick={() => setSelectedProject(null)} className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer mb-1 block">← All projects</button>
          <h1 className="text-xl font-semibold text-gray-800">{selectedProject}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{projectSessions.length} session{projectSessions.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="space-y-3">
        {projectSessions.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-100 px-4 py-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-gray-700">{s.name}</h3>
              <span className="text-xs text-gray-400 shrink-0 ml-2">{new Date(s.startedAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
              <span>{s.tags?.length || 0} tags</span>
              <span>{s.participants?.length || 1} participant{(s.participants?.length || 1) !== 1 ? 's' : ''}</span>
              {s.endedAt && s.startedAt && <span>{formatTime(s.endedAt - s.startedAt)}</span>}
              <span className={`px-1.5 py-0.5 rounded text-xs ${s.status === 'live' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {s.status === 'live' ? 'live' : 'ended'}
              </span>
            </div>
            {s.tags && s.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {Object.entries(
                  s.tags.reduce((acc, t) => {
                    acc[t.label] = { count: (acc[t.label]?.count || 0) + 1, color: t.color }
                    return acc
                  }, {})
                ).map(([label, { count, color }]) => (
                  <span key={label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: color + '20', color }}>
                    {label} ({count})
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => onLoad(s)}
                className="flex-1 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
                Review
              </button>
              <button
                onClick={() => { if (confirm('Delete this session?')) onDelete(s.id) }}
                className="px-3 py-2 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
