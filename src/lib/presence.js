import {
  doc, setDoc, deleteDoc, getDoc, serverTimestamp, onSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'

// A user is considered "active" if their lastSeen is within this window
const ACTIVE_WINDOW_MS = 30 * 60 * 1000 // 30 minutes
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000 // ping every 2 minutes

/**
 * Check if an ldap is already in use by another active session.
 * Returns { taken: bool, lastSeen: Date | null }
 */
export async function checkLdapAvailable(ldap) {
  const ref = doc(db, 'users', ldap.toLowerCase())
  const snap = await getDoc(ref)
  if (!snap.exists()) return { taken: false, lastSeen: null }

  const data = snap.data()
  const lastSeen = data.lastSeen?.toMillis?.() || 0
  const age = Date.now() - lastSeen
  const taken = age < ACTIVE_WINDOW_MS

  return { taken, lastSeen: new Date(lastSeen) }
}

/**
 * Register this ldap as active. Call on login.
 * Returns a cleanup function to call on logout/unload.
 */
export async function registerPresence(ldap) {
  const ref = doc(db, 'users', ldap.toLowerCase())
  await setDoc(ref, {
    ldap,
    lastSeen: serverTimestamp(),
    deviceId: getDeviceId(),
  })
}

/**
 * Start a heartbeat that keeps lastSeen fresh while the user is active.
 * Returns a stop function.
 */
export function startHeartbeat(ldap) {
  const ref = doc(db, 'users', ldap.toLowerCase())

  const tick = () => {
    setDoc(ref, {
      ldap,
      lastSeen: serverTimestamp(),
      deviceId: getDeviceId(),
    }).catch(() => {}) // silent fail — don't crash the app
  }

  const interval = setInterval(tick, HEARTBEAT_INTERVAL_MS)

  // Also update on visibility change (tab comes back into focus)
  const onVisible = () => { if (document.visibilityState === 'visible') tick() }
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    clearInterval(interval)
    document.removeEventListener('visibilitychange', onVisible)
  }
}

/**
 * Remove presence on logout or tab close.
 */
export async function clearPresence(ldap) {
  try {
    await deleteDoc(doc(db, 'users', ldap.toLowerCase()))
  } catch {} // silent — best effort
}

/**
 * Get or create a stable device ID stored in localStorage.
 * Used to allow the same user to re-login from the same device
 * (e.g. after a refresh) without being blocked.
 */
function getDeviceId() {
  let id = localStorage.getItem('clickr_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('clickr_device_id', id)
  }
  return id
}

/**
 * Check if the current device already owns this ldap's presence.
 * If so, we can skip the "already in use" check (it's just a refresh).
 */
export async function isOwnDevice(ldap) {
  const ref = doc(db, 'users', ldap.toLowerCase())
  const snap = await getDoc(ref)
  if (!snap.exists()) return false
  return snap.data().deviceId === getDeviceId()
}
