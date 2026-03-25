# AetherMail

<div align="center">
  <img src="src/assets/arcbyte.co%20Logo_white_transparent.png" alt="AetherMail" width="140" />
  <p><strong>A modern, AI-assisted mail client UI</strong></p>
  <p>Fast inbox workflows • Rich compose • Search + filters + voice • Demo mailbox + notifications • Docker-ready</p>
</div>

---

## What is AetherMail?

AetherMail is a sleek web mail client built with React + Vite. It focuses on a high-signal inbox experience with helpful AI-assisted reply drafting, smart scoring (importance + spam likelihood), and productivity UX like per-mail reminders and fast search.

This repository ships with a fully functional **demo mailbox mode** so the app is usable without a real mail server during development and in Docker.

---

## Highlights

- **Inbox intelligence**
  - Importance score badge per mail (color-coded)
  - Spam likelihood badge in Spam
  - Reply reminders for unread mail (banner + per-mail “Reply” quick action)
- **AI assistance**
  - Ask AI overlay for the selected thread (summary, action items, draft reply)
  - “Draft reply” for each mail that adapts to the email’s content
- **Search that works**
  - Search by sender/email/subject/snippet
  - Filters (Unread only, Starred only, Importance > 80%)
  - Voice input (SpeechRecognition; requires supported browser + HTTPS/localhost)
- **Beautiful UX**
  - Rich text editor compose experience (TipTap)
  - Live “New mail” notifications in demo mode (toast + optional browser notification)
- **Docker support**
  - Production image served by nginx (SPA routing included)
  - Optional dev container for hot reload

---

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- TipTap editor
- Lucide icons

---

## Getting Started (Local)

### Prerequisites

- Node.js 20+
- npm

### Install & run

```bash
npm ci
npm run dev
```

Open:
- http://localhost:5174

### Build

```bash
npm run build
npm run preview
```

---

## Demo Mode (Recommended)

Demo mode is designed for local and Docker usage so you can explore the full UI without real credentials.

Ways to enter demo mode:
- Use the **Dev auth bypass** button on the login screen (when available)
- Run on `localhost` and append `?demo=1` to the URL (e.g. `/mail/login?demo=1`)

When demo mode is active:
- The inbox is pre-populated across **Inbox / Sent / Drafts / Spam / Trash**
- New demo mails arrive every **20 seconds**
- A “New mail” popup appears (and a browser notification if permission is granted)

---

## Running with Docker

### Production (nginx)

```bash
docker compose up --build aethermail
```

Open:
- http://localhost:8080

### Development (hot reload)

```bash
docker compose up --build aethermail-dev
```

Open:
- http://localhost:5174

Stop containers:

```bash
docker compose down
```

---

## Notes

- **Voice search** depends on the browser SpeechRecognition API (best in Chrome) and requires **HTTPS or localhost**.
- The demo mailbox and UI features are client-side and meant for showcasing the experience. Backend mail endpoints can be integrated separately.

---

## Project Structure

```text
src/
  pages/mail/         Mail UI (MailApp, Login, Security screens)
  components/mail/    Ask AI overlay + AI helpers
  components/editor/  Rich text editor (TipTap)
  context/            Auth context (demo bypass support)
  api/                API client
```

---

## Author

**AetherMail by Aditi Menon**

