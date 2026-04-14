/**
 * Format milliseconds to MM:SS or HH:MM:SS
 */
export function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

/**
 * Parse time string to milliseconds. Supports:
 * - HH:MM:SS
 * - MM:SS
 * - HH:MM:SS,mmm (SRT format)
 * - H:MM:SS.mmm (SBV format)
 */
export function parseTimeToMs(timeStr) {
  // Handle SRT format: 00:01:23,456
  const srtMatch = timeStr.match(/(\d+):(\d+):(\d+),(\d+)/)
  if (srtMatch) {
    return (Number(srtMatch[1]) * 3600 + Number(srtMatch[2]) * 60 + Number(srtMatch[3])) * 1000 + Number(srtMatch[4])
  }
  // Handle SBV format: 0:01:23.456
  const sbvMatch = timeStr.match(/(\d+):(\d+):(\d+)\.(\d+)/)
  if (sbvMatch) {
    return (Number(sbvMatch[1]) * 3600 + Number(sbvMatch[2]) * 60 + Number(sbvMatch[3])) * 1000 + Number(sbvMatch[4])
  }
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000
  return (parts[0] * 60 + parts[1]) * 1000
}

/**
 * Detect format and parse transcript. Supports:
 * - Google Meet TXT
 * - SRT subtitles
 * - SBV subtitles
 */
export function parseTranscript(text) {
  const trimmed = text.trim()

  // Detect SRT: starts with "1\n00:00:..."
  if (/^\d+\r?\n\d{2}:\d{2}:\d{2},\d{3}\s*-->/.test(trimmed)) {
    return parseSRT(trimmed)
  }
  // Detect SBV: starts with "0:00:00.000,0:00:..."
  if (/^\d+:\d{2}:\d{2}\.\d{3},/.test(trimmed)) {
    return parseSBV(trimmed)
  }
  return parseGoogleMeetTxt(trimmed)
}

function parseSRT(text) {
  const blocks = text.split(/\r?\n\r?\n/).filter(Boolean)
  return blocks.map(block => {
    const lines = block.split(/\r?\n/)
    // line 0: sequence number, line 1: timestamps, line 2+: text
    const timeMatch = lines[1]?.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->/)
    const timeLabel = timeMatch ? timeMatch[1].replace(',', '.').slice(0, 8) : '00:00'
    const timestampMs = timeMatch ? parseTimeToMs(timeMatch[1]) : 0
    const content = lines.slice(2).join(' ').replace(/<[^>]+>/g, '')
    return { speaker: 'Speaker', timeLabel, timestampMs, text: content }
  }).filter(e => e.text)
}

function parseSBV(text) {
  const blocks = text.split(/\r?\n\r?\n/).filter(Boolean)
  return blocks.map(block => {
    const lines = block.split(/\r?\n/)
    const timeMatch = lines[0]?.match(/^(\d+:\d{2}:\d{2}\.\d{3}),/)
    const timeLabel = timeMatch ? timeMatch[1].slice(0, 7) : '00:00'
    const timestampMs = timeMatch ? parseTimeToMs(timeMatch[1]) : 0
    const content = lines.slice(1).join(' ')
    return { speaker: 'Speaker', timeLabel, timestampMs, text: content }
  }).filter(e => e.text)
}

function parseGoogleMeetTxt(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const entries = []

  const pattern1 = /^(.+?)\s*\((\d{1,2}:\d{2}(?::\d{2})?)\)\s*$/
  const pattern2 = /^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/
  const pattern3 = /^(\d{1,2}:\d{2}(?::\d{2})?)$/

  const isHeader = (line) => pattern1.test(line) || pattern2.test(line) || pattern3.test(line)

  let i = 0
  while (i < lines.length) {
    let match

    match = lines[i].match(pattern1)
    if (match) {
      const speaker = match[1]
      const timeLabel = match[2]
      const timestampMs = parseTimeToMs(timeLabel)
      i++
      let txt = ''
      while (i < lines.length && !isHeader(lines[i])) { txt += (txt ? ' ' : '') + lines[i]; i++ }
      entries.push({ speaker, timeLabel, timestampMs, text: txt })
      continue
    }

    match = lines[i].match(pattern2)
    if (match) {
      const timeLabel = match[1]
      const speaker = match[2]
      const timestampMs = parseTimeToMs(timeLabel)
      i++
      let txt = ''
      while (i < lines.length && !isHeader(lines[i])) { txt += (txt ? ' ' : '') + lines[i]; i++ }
      entries.push({ speaker, timeLabel, timestampMs, text: txt })
      continue
    }

    match = lines[i].match(pattern3)
    if (match && i + 1 < lines.length) {
      const timeLabel = match[1]
      const timestampMs = parseTimeToMs(timeLabel)
      i++
      const speaker = lines[i] || 'Unknown'
      i++
      let txt = ''
      while (i < lines.length && !isHeader(lines[i])) { txt += (txt ? ' ' : '') + lines[i]; i++ }
      entries.push({ speaker, timeLabel, timestampMs, text: txt })
      continue
    }

    i++
  }
  return entries
}
