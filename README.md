# AetherMail

<div align="center">
  <img src="src/assets/arcbyte.co%20Logo_white_transparent.png" alt="AetherMail" width="140" />

  <h3>AI-assisted mail client UI</h3>
  <p>Modern inbox workflows • Smart scoring • Rich compose • Search + filters + voice • Demo mailbox + notifications • Docker-ready</p>

  <p>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript&logoColor=white" />
    <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?style=flat&logo=react&logoColor=white" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?style=flat&logo=vite&logoColor=white" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=flat&logo=tailwindcss&logoColor=white" />
    <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat&logo=docker&logoColor=white" />
  </p>
</div>

---

## Overview

AetherMail is a sleek web mail client built with **React + TypeScript + Vite**. It focuses on a high-signal inbox experience with AI-assisted reply drafting, smart scoring (importance + spam likelihood), and productivity UX like reminders, fast search, and rich composing.

This repo includes a fully functional **demo mailbox mode** so you can use the app without a real mail server (perfect for local dev, Docker, and Vercel demos).

---

## Features

### Inbox Intelligence

- Importance score badge per email (color-coded thresholds)
- Spam likelihood badge for spam emails
- Reply reminders for unread mail (banner + per-mail quick reply actions)
- Draft and starred tags in relevant folders
- Trash retention reminder + one-click restore from trash

### AI Assistance

- Ask AI overlay for the selected thread:
  - Summary
  - Action items
  - Draft reply
- “Draft reply” adapts to each email’s content (recap, timeline cues, next steps, clarifications)

### Search, Filters & Voice

- Search by sender/email/subject/snippet
- Filters: Unread only, Starred only, Importance > 80%
- Voice input (SpeechRecognition; requires a supported browser + HTTPS/localhost)

### Demo Mailbox Experience

- Pre-populated Inbox / Sent / Drafts / Spam / Trash
- New demo mails arrive every **20 seconds**
- Beautiful “New mail” popup + optional browser notification

---

## Tech Stack

### Languages

- TypeScript
- HTML / CSS

### Frameworks & Tools

- React 19
- Vite 7
- Tailwind CSS 4
- Framer Motion
- TipTap editor
- Lucide icons
- Axios

---

## Quick Start (Local)

### Prerequisites

- Node.js 20+
- npm

### Run

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

## Demo Mode

Ways to enable demo mode:
- Add `?demo=1` to the URL (example: `/mail/login?demo=1`)
- Set an env var in your deployment: `VITE_DEMO_MODE=true` (or `VITE_PUBLIC_DEMO=true`)

When demo mode is active:
- The inbox is pre-populated across folders
- New demo mails arrive every 20 seconds
- “New mail” toasts appear automatically

---

## Docker

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

## Project Structure

```text
src/
  pages/mail/         Mail UI (MailApp, Login)
  components/mail/    Ask AI overlay + AI helpers
  components/editor/  Rich text editor (TipTap)
  context/            Auth context (demo bypass support)
  api/                API client
```

---

## Author

**AetherMail by Aditi Menon**

---

<div align="center">
  <strong>Powered By ArcByte</strong>
</div>
