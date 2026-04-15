# .clickr — UXR Tagging Tool

A real-time session tagging tool built for UX researchers. Designed to replace manual note-taking during user interviews by letting researchers and observers drop timestamped tags during a live session, then review and export findings paired with the session transcript.

---

## The Problem

During a user research session, a researcher is focused on the participant — asking questions, listening, probing. Taking detailed notes at the same time is cognitively expensive and often means missing moments. After the session, reconstructing what happened and when is slow and imprecise.

Existing tools either require too much setup, are too general-purpose, or don't support collaborative tagging from multiple observers in the same session.

---

## What .clickr Does

### Before the session
- Researcher logs in with their ldap
- Creates a session under a project (e.g. "Mobile App Redesign" → "P03 - Onboarding test")
- Configures tag buttons (Pain point, Delight, Confusion, Quote, Insight, Feature req — fully customizable)
- Optionally sets a session password
- Shares the 6-character session code with observers

### During the session
- A live timer runs from the moment the session starts
- Researcher and observers click tag buttons to drop timestamped bookmarks
- Each tag records who clicked it and when
- Observers can send lightweight emoji reactions (👀 🔥 ⚠️ 💡 ❓) that float on screen — a non-disruptive signal channel
- New tag buttons can be added mid-session without stopping
- Host can pause the timer (e.g. for breaks) and resume
- All tags sync in real time across all participants via Firestore
- Tag log is collapsible and filterable by who tagged

### After the session
- Post-session summary shows tag breakdown, most active moments, duration, and per-person tag counts
- Transcript import (Google Meet .txt, .srt, .sbv) auto-matches timestamps to tags
- Merged view shows the full conversation with tag overlays highlighted inline
- Offset slider for manual timestamp alignment if needed
- Export to CSV (with session metadata, tagger, transcript context) or a styled HTML report

---

## Architecture

```
Frontend         React + Vite + Tailwind CSS v4
Database         Firebase Firestore (real-time NoSQL)
Hosting          Vercel (auto-deploy from GitHub)
Auth             Ldap-based presence system (no passwords — Firestore user registry)
```

### Data model

```
/sessions/{sessionId}
  name            string
  projectName     string
  notes           string
  code            string        6-char join code
  password        string        optional
  status          'live' | 'ended'
  startedAt       timestamp
  endedAt         timestamp
  buttons         array         tag button config
  tags            array         { label, color, timestamp, taggedBy, note }
  participants    array         { name, role, joinedAt }
  reactions       array         { emoji, from, timestamp }

/users/{ldap}
  ldap            string
  lastSeen        timestamp     updated every 2 min (heartbeat)
  deviceId        string        prevents duplicate logins
```

### Key design decisions

**Ldap uniqueness without auth** — a `users` collection tracks active sessions per ldap. On login, the app checks if the ldap is already active on another device (within a 30-minute window). Same device refreshes are allowed via a stable `deviceId` in localStorage. Presence is cleared on logout and on tab close via `beforeunload`.

**Real-time sync** — Firestore `onSnapshot` listeners keep all participants in sync. Tags, reactions, and button changes propagate instantly. When the host ends a session, all observers are automatically redirected to the summary screen.

**Timestamp matching** — clicker timestamps are relative to session start (elapsed ms). Transcript timestamps are relative to recording start. On import, the app finds the first tag and the nearest transcript line to compute an auto-offset. A manual slider allows fine-tuning.

**Session persistence** — sessions stay `live` in Firestore until the host explicitly ends them. If a host navigates away, a leave confirmation warns them the session keeps running. On return, a "Session in progress" resume banner appears on the setup screen.

---

## Features

| Feature | Detail |
|---|---|
| Live session tagging | Timestamped tags synced in real time |
| Multi-participant | Multiple observers can tag simultaneously |
| Emoji reactions | Non-disruptive signal channel during sessions |
| Session codes | 6-char join codes, optional password |
| Pause / resume | Timer pauses for breaks, host-only |
| Undo | Remove last tag instantly |
| Keyboard shortcuts | 1–9 for tags, Z for undo, Space for pause |
| Mid-session buttons | Add new tag types without stopping |
| Tag log | Collapsible, filterable by tagger |
| Project grouping | Sessions organized under projects |
| Session history | Browse past sessions by project |
| Post-session summary | Tag breakdown, hot moments, per-person stats |
| Transcript import | Google Meet .txt, .srt, .sbv |
| Auto timestamp match | Aligns clicker tags to transcript lines |
| CSV export | Session metadata + tagger + transcript context |
| HTML report | Styled standalone report for sharing |
| Ldap uniqueness | Prevents duplicate logins across devices |
| Resume session | Rejoin a live session after navigating away |

---

## Stack

- **React 19** with hooks — no class components, no Redux
- **Vite 8** — fast dev server and build
- **Tailwind CSS v4** — utility-first, no custom CSS files
- **Firebase Firestore** — real-time document database
- **Vercel** — zero-config deployment from GitHub

---

## Running locally

```bash
git clone https://github.com/gizmonty/clickr.git
cd clickr/uxr-clicker
npm install
npm run dev
```

Firebase is already configured. Firestore must be enabled in the Firebase Console (Firestore → Create database → Test mode).

---

## Project structure

```
src/
  components/
    TopBar.jsx          Shared header with centered logo + nav slots
    WelcomeScreen.jsx   Ldap login + create/join choice
    SetupScreen.jsx     Session setup — project, name, buttons, password
    JoinScreen.jsx      Join by session code
    SessionScreen.jsx   Live tagging — timer, buttons, reactions, log
    SummaryScreen.jsx   Post-session stats and breakdown
    ReviewScreen.jsx    Transcript import, tag review, export
    HistoryScreen.jsx   Project-grouped session history
  lib/
    firebase.js         Firebase app init
    sessions.js         Firestore read/write for sessions
    presence.js         Ldap uniqueness and heartbeat
  utils/
    time.js             Timer formatting + transcript parsing (TXT/SRT/SBV)
    storage.js          localStorage for buttons and username
```

---

## What's next

- Username + password auth (Firebase Auth) to replace ldap presence system
- Participant attribution — link tags to specific research participants
- Session phases — mark task boundaries as timeline markers
- Mobile reaction UX — reactions currently overlap tag buttons on small screens
- Transcript auto-upload — connect directly to Google Meet API
