/**
 * Format milliseconds to MM:SS or HH:MM:SS
 */
export function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n) => String(n).padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(minutes)}:${pad(seconds)}`
}

/**
 * Parse a Google Meet transcript .txt file.
 *
 * Google Meet transcripts typically look like:
 *   Speaker Name (00:01:23)
 *   What they said goes here
 *
 * Or sometimes:
 *   00:01:23 Speaker Name
 *   What they said goes here
 *
 * We handle both formats.
 */
export function parseTranscript(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const entries = []

  // Pattern 1: "Speaker Name (HH:MM:SS)" or "Speaker Name (MM:SS)"
  const pattern1 = /^(.+?)\s*\((\d{1,2}:\d{2}(?::\d{2})?)\)\s*$/
  // Pattern 2: "(HH:MM:SS)" or timestamp on its own line, then speaker
  const pattern2 = /^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/
  // Pattern 3: Just a timestamp line "HH:MM:SS" or "MM:SS"
  const pattern3 = /^(\d{1,2}:\d{2}(?::\d{2})?)$/

  let i = 0
  while (i < lines.length) {
    let match

    // Try pattern 1: "Speaker (timestamp)"
    match = lines[i].match(pattern1)
    if (match) {
      const speaker = match[1]
      const timeLabel = match[2]
      const timestampMs = parseTimeToMs(timeLabel)
      // Next line(s) are the text
      i++
      let text = ''
      while (i < lines.length && !lines[i].match(pattern1) && !lines[i].match(pattern2) && !lines[i].match(pattern3)) {
        text += (text ? ' ' : '') + lines[i]
        i++
      }
      entries.push({ speaker, timeLabel, timestampMs, text })
      continue
    }

    // Try pattern 2: "timestamp Speaker"
    match = lines[i].match(pattern2)
    if (match) {
      const timeLabel = match[1]
      const speaker = match[2]
      const timestampMs = parseTimeToMs(timeLabel)
      i++
      let text = ''
      while (i < lines.length && !lines[i].match(pattern1) && !lines[i].match(pattern2) && !lines[i].match(pattern3)) {
        text += (text ? ' ' : '') + lines[i]
        i++
      }
      entries.push({ speaker, timeLabel, timestampMs, text })
      continue
    }

    // Try pattern 3: standalone timestamp, next line is speaker or text
    match = lines[i].match(pattern3)
    if (match && i + 1 < lines.length) {
      const timeLabel = match[1]
      const timestampMs = parseTimeToMs(timeLabel)
      i++
      const speaker = lines[i] || 'Unknown'
      i++
      let text = ''
      while (i < lines.length && !lines[i].match(pattern1) && !lines[i].match(pattern2) && !lines[i].match(pattern3)) {
        text += (text ? ' ' : '') + lines[i]
        i++
      }
      entries.push({ speaker, timeLabel, timestampMs, text })
      continue
    }

    // Fallback: skip unrecognized line
    i++
  }

  return entries
}

function parseTimeToMs(timeStr) {
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000
  }
  return (parts[0] * 60 + parts[1]) * 1000
}
