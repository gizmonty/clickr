import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, arrayUnion, getDoc, getDocs, where,
} from 'firebase/firestore'
import { db } from './firebase'

const sessionsRef = collection(db, 'sessions')

/**
 * Generate a 6-char alphanumeric join code
 */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/**
 * Create a new live session in Firestore
 */
export async function createSession({ name, projectName, notes, hostName, buttons, password }) {
  const code = generateCode()
  console.log('Creating session with projectId:', db.app.options.projectId)
  const docRef = await addDoc(sessionsRef, {
    name,
    projectName: projectName || '',
    notes: notes || '',
    code,
    password: password || '',
    status: 'live',
    startedAt: Date.now(),
    endedAt: null,
    buttons,
    tags: [],
    participants: [{ name: hostName || 'Host', role: 'host', joinedAt: Date.now() }],
    createdBy: hostName || 'Host',
  })
  console.log('Session created with ID:', docRef.id)
  return { id: docRef.id, code }
}

/**
 * Find a session by join code
 */
export async function findSessionByCode(code) {
  const q = query(sessionsRef, where('code', '==', code.toUpperCase()))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const docSnap = snap.docs[0]
  return { id: docSnap.id, ...docSnap.data() }
}

/**
 * Join a session as a participant
 */
export async function joinSession(sessionId, participantName) {
  const ref = doc(db, 'sessions', sessionId)
  await updateDoc(ref, {
    participants: arrayUnion({
      name: participantName,
      role: 'observer',
      joinedAt: Date.now(),
    }),
  })
}

/**
 * Add a tag to a live session
 */
export async function addTag(sessionId, tag) {
  const ref = doc(db, 'sessions', sessionId)
  await updateDoc(ref, {
    tags: arrayUnion({
      id: tag.id,
      label: tag.label,
      color: tag.color,
      timestamp: tag.timestamp,
      note: tag.note || '',
      taggedBy: tag.taggedBy || 'Host',
      participant: tag.participant || '',
    }),
  })
}

/**
 * Remove the last tag (undo) — replaces the entire tags array minus the last one
 */
export async function removeLastTag(sessionId, currentTags) {
  const ref = doc(db, 'sessions', sessionId)
  await updateDoc(ref, { tags: currentTags.slice(0, -1) })
}

/**
 * Update a tag's note
 */
export async function updateTagNote(sessionId, currentTags, tagId, note) {
  const ref = doc(db, 'sessions', sessionId)
  const updated = currentTags.map(t => t.id === tagId ? { ...t, note } : t)
  await updateDoc(ref, { tags: updated })
}

/**
 * Update session participants list
 */
export async function updateParticipants(sessionId, participants) {
  const ref = doc(db, 'sessions', sessionId)
  await updateDoc(ref, { participants })
}

/**
 * Update session buttons (add/remove mid-session)
 */
export async function updateSessionButtons(sessionId, buttons) {
  const ref = doc(db, 'sessions', sessionId)
  await updateDoc(ref, { buttons })
}

/**
 * Add a reaction to a session
 */
export async function addReaction(sessionId, reaction) {
  const ref = doc(db, 'sessions', sessionId)
  await updateDoc(ref, {
    reactions: arrayUnion({
      id: crypto.randomUUID(),
      emoji: reaction.emoji,
      from: reaction.from,
      timestamp: reaction.timestamp,
    }),
  })
}

/**
 * End a session
 */
export async function endSession(sessionId) {
  const ref = doc(db, 'sessions', sessionId)
  await updateDoc(ref, { status: 'ended', endedAt: Date.now() })
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId) {
  await deleteDoc(doc(db, 'sessions', sessionId))
}

/**
 * Subscribe to realtime updates for a single session
 */
export function subscribeToSession(sessionId, callback) {
  const ref = doc(db, 'sessions', sessionId)
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() })
    }
  })
}

/**
 * Subscribe to all sessions (for history)
 */
export function subscribeToAllSessions(callback) {
  const q = query(sessionsRef, orderBy('startedAt', 'desc'))
  return onSnapshot(q, (snap) => {
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(sessions)
  }, (error) => {
    console.error('History subscription error:', error)
  })
}
