const SESSIONS_KEY = 'uxr_clicker_sessions'
const BUTTONS_KEY = 'uxr_clicker_buttons'

export function saveSessions(sessions) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  } catch (e) {
    console.warn('Failed to save sessions:', e)
  }
}

export function loadSessions() {
  try {
    const data = localStorage.getItem(SESSIONS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveButtons(buttons) {
  try {
    localStorage.setItem(BUTTONS_KEY, JSON.stringify(buttons))
  } catch (e) {
    console.warn('Failed to save buttons:', e)
  }
}

export function loadButtons() {
  try {
    const data = localStorage.getItem(BUTTONS_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}
