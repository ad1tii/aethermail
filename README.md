# Arcmail

<div align="center">
  <img src="src/assets/arcbyte.co%20Logo_white_transparent.png" alt="Arcmail" width="140" />

  <h3>Operator‑grade messaging UI • AI‑assisted replies • Demo mailbox</h3>

  <p>
    <a href="https://Arcmail-teal.vercel.app/"><strong>Live Demo</strong></a>
    &nbsp;•&nbsp;
    <a href="#features">Features</a>
    &nbsp;•&nbsp;
    <a href="#quick-start-local">Quick Start</a>
    &nbsp;•&nbsp;
    <a href="#docker">Docker</a>
  </p>

  <p>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=0B0B0B" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
    <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  </p>
</div>

<br/>

<div align="center">
  <img alt="Gradient line" src="https://capsule-render.vercel.app/api?type=rect&color=gradient&height=2&section=header" />
</div>

## Overview

Arcmail is a sleek web mail client built with **React + TypeScript + Vite**. It’s designed for fast, high-signal inbox workflows with:

- Smart scoring (**importance** + **spam likelihood**)
- AI-assisted drafting (summary, action items, reply drafts)
- Modern composing (rich-text editor, attachments)
- Search that actually works (plus filters + voice input)
- A full **demo mailbox mode** for deployments and previews

### Live Demo

**https://Arcmail-teal.vercel.app/**

<div align="center">
  <img alt="Gradient line" src="https://capsule-render.vercel.app/api?type=rect&color=gradient&height=2&section=header" />
</div>

## Features

### Inbox Intelligence

- 🟢🟠🔴 Importance score badge per email (color-coded thresholds)
- 🚫 Spam likelihood badge in Spam
- ⏰ Reply reminders for unread mail (banner + per-mail “Reply” action)
- 🏷️ Draft and Starred tags where relevant
- 🗑️ Trash retention reminder + one-click restore from trash

### AI Assistance

- ✨ Ask AI overlay for the selected thread:
  - Summary
  - Action items
  - Draft reply
- 🧠 Draft replies adapt to each email’s content (recap, timeline cues, next steps, clarifications)

### Search, Filters & Voice

- 🔎 Search by sender/email/subject/snippet
- 🎛️ Filters: Unread only, Starred only, Importance > 80%
- 🎙️ Voice input (SpeechRecognition; supported browser + HTTPS/localhost)

### Demo Mailbox Experience

- 📬 Pre-populated Inbox / Sent / Drafts / Spam / Trash
- ⏱️ New demo mails arrive every **20 seconds**
- 🔔 Beautiful “New mail” popup + optional browser notification

<div align="center">
  <img alt="Gradient line" src="https://capsule-render.vercel.app/api?type=rect&color=gradient&height=2&section=header" />
</div>

## Tech Stack

### Languages

<p>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" />
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" />
</p>

### Frameworks & Libraries

<p>
  <img alt="React" src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=0B0B0B" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img alt="Framer Motion" src="https://img.shields.io/badge/Framer%20Motion-0055FF?style=flat-square&logo=framer&logoColor=white" />
  <img alt="TipTap" src="https://img.shields.io/badge/TipTap-111111?style=flat-square&logo=editorconfig&logoColor=white" />
  <img alt="Lucide" src="https://img.shields.io/badge/Lucide-111111?style=flat-square&logo=lucide&logoColor=white" />
  <img alt="Axios" src="https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white" />
</p>

### Tooling

<p>
  <img alt="ESLint" src="https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" />
</p>

<div align="center">
  <img alt="Gradient line" src="https://capsule-render.vercel.app/api?type=rect&color=gradient&height=2&section=header" />
</div>

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

<div align="center">
  <img alt="Gradient line" src="https://capsule-render.vercel.app/api?type=rect&color=gradient&height=2&section=header" />
</div>

## Demo Mode

Enable demo mode in any environment:

- URL flag: `?demo=1` (example: `/mail/login?demo=1`)
- Deployment env var: `VITE_DEMO_MODE=true` (or `VITE_PUBLIC_DEMO=true`)

Demo mode includes:

- Pre-populated folders (Inbox/Sent/Drafts/Spam/Trash)
- Automatic new mail every 20 seconds
- Notification toasts

<div align="center">
  <img alt="Gradient line" src="https://capsule-render.vercel.app/api?type=rect&color=gradient&height=2&section=header" />
</div>

## Docker

### Production (nginx)

```bash
docker compose up --build Arcmail
```

Open:
- http://localhost:8080

### Development (hot reload)

```bash
docker compose up --build Arcmail-dev
```

Open:
- http://localhost:5174

Stop containers:

```bash
docker compose down
```

<div align="center">
  <img alt="Gradient line" src="https://capsule-render.vercel.app/api?type=rect&color=gradient&height=2&section=header" />
</div>

## Project Structure

```text
src/
  pages/mail/         Mail UI (MailApp, Login)
  components/mail/    Ask AI overlay + AI helpers
  components/editor/  Rich text editor (TipTap)
  context/            Auth context (demo bypass support)
  api/                API client
```

## Author

**Arcmail by Aditi Menon**

<br/>

<div align="center">
  <strong>Powered By ArcByte</strong>
</div>
