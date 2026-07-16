# Architecture — InterviewPrepApp

## Overview

InterviewPrepApp (SDET Co-Pilot) is a **Next.js 16** web application designed to help users collect, catalog, edit, and organize technical interview preparation questions. It features automated AI-driven question and company name extraction, multi-tag categorization, an AI study guide compiler, an interactive Kanban board task tracker, flipping flashcards, speech-enabled mock interviews, and live QA community feeds. All LLM features are powered by the **NVIDIA AI completions API (`meta/llama-3.1-8b-instruct` model)**.

---

## High-Level Architecture

```
                               ┌────────────────────────────────┐
                               │     LinkedIn.com (in Browser)  │
                               │                                │
                               │   [Browser Bookmarklet Script]  │
                               └───────────────┬────────────────┘
                                               │ redirects (GET)
                                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 App (App Router)                           │
│                                                                              │
│   ┌──────────────────────────┐                                               │
│   │       Frontend (UI)      │  ← React Client Components (app/page.js)      │
│   └───────────┬──────────────┘                                               │
│               │ fetch()                                                      │
│   ┌───────────▼──────────────────────────────────────────────────────────┐   │
│   │                       API Routes (Server-side)                       │   │
│   │                                                                      │   │
│   │  • /api/receive-post-get  → Writes temp post metadata & redirects    │   │
│   │  • /api/pending-post      → Reads and deletes temp import data       │   │
│   │  • /api/extract-questions → AI questions & tags extraction/polishing │   │
│   │  • /api/posts             → Reads/Writes files inside local database  │   │
│   │  • /api/boards            → Reads/Writes Kanban boards data          │   │
│   │  • /api/activity          → Reads/Writes study activity metrics      │   │
│   │  • /api/generate-study-guide → AI-based question consolidation       │   │
│   │  • /api/fetch-community-questions → Fetches Reddit/StackOverflow QA  │   │
│   └───────────┬──────────────────────────────────────────────────────────┘   │
└───────────────┼──────────────────────────────────────────────────────────────┘
                │ requests completions via OpenAI SDK (with server API Key)
                ▼
  ┌──────────────────────────┐
  │   NVIDIA AI Completions  │  ← Chat completions using model 'meta/llama-3.1-8b-instruct'
  │   API Endpoint           │
  └──────────────────────────┘
```

---

## Folder Structure

```
interviewPrepApp/
├── README.md               ← Main project setup and overview
├── Architecture.md         ← This file
├── memory.md               ← Agent persistent memory log
├── skill.md                ← Skills catalogue (bookmarklet, AI, database, mock interviews)
└── app/                    ← Next.js application root
    ├── next.config.mjs     ← Next.js configurations
    ├── package.json        ← Frontend npm packages
    ├── data/               ← Project Filesystem Database (Commited to Git)
    │   ├── posts.json      ← Saved posts, company metadata, and questions list
    │   ├── boards.json     ← Stored Kanban boards with category cards
    │   ├── activity.json   ← Stored study dates, target date, and daily goals
    │   ├── tags.json       ← Saved list of active categories / tags
    │   └── config.json     ← Stored configs (API keys - Git Ignored for security)
    ├── components/         ← Reusable Client Components
    │   ├── AddPostModal.js
    │   ├── CommunityQuestionsFetcher.js
    │   ├── DashboardTab.js
    │   ├── FlashcardsTab.js
    │   ├── FocusClockTab.js
    │   ├── MockInterviewTab.js
    │   ├── PrepTab.js
    │   ├── ResourcesTab.js
    │   ├── SaveBoardModal.js
    │   ├── Toast.js
    │   ├── TrackerTab.js
    │   ├── TrackerTaskModal.js
    │   ├── ViewPostModal.js
    │   └── utils.js
    ├── app/
    │   ├── layout.js       ← Main HTML layout with suppressHydrationWarning
    │   ├── globals.css     ← Design system layout (Kanban columns, Pomodoro clocks, light/dark themes)
    │   ├── page.js         ← Tab routers and layout shell
    │   └── api/
    │       ├── receive-post-get/
    │       │   └── route.js   ← Redirect target for the LinkedIn bookmarklet
    │       ├── pending-post/
    │       │   └── route.js   ← Temporary file read & cleanup endpoint
    │       ├── extract-questions/
    │       │   └── route.js   ← AI questions extraction & polishing endpoint
    │       ├── posts/
    │       │   └── route.js   ← Filesystem JSON database read/write routes
    │       ├── boards/
    │       │   └── route.js   ← Reads and writes boards.json
    │       ├── activity/
    │       │   └── route.js   ← Reads and writes activity.json
    │       ├── fetch-community-questions/
    │       │   └── route.js   ← Pulls QA datasets from external communities
    │       └── generate-study-guide/
    │           └── route.js   ← AI study guide consolidation completions
    └── public/
```

---

## Component Architecture

### Modularized Client Features (`app/components/`)
To maintain clean Next.js code structures, monolithic states in `page.js` were split into focused feature layouts:

* **DashboardTab**: Renders key preparation analytics, daily study progress indicators, target date countdowns, the calendar heatmap, and board selections.
* **ResourcesTab**: Holds the main list of added posts, multi-tag filters, search keywords, and action sheets.
* **PrepTab**: Configures study topics and compiles consolidated Markdown study guides with de-duplicated questions.
* **TrackerTab**: Interactive Kanban board (To Do, In Progress, Done) split across study boards, supporting focus monitors and inline question insertions.
* **FlashcardsTab**: Displays flipping card elements mapping to board questions for vocabulary or syntax practice.
* **MockInterviewTab**: Simulates live technical screens. Evaluates speech/typed answers and generates formatted reports.
* **FocusClockTab**: Lifted focus timer representing Pomodoro mechanics with chime chimes and browser push notification triggers.

---

## API Endpoints

### 1. `GET /api/receive-post-get`
Bookmarklet redirection target. Automatically parses post details, polished questions using NVIDIA Llama-3.1-8b-instruct, maps tags, and caches result.

### 2. `POST /api/extract-questions`
Direct extraction endpoint. Also handles bulk polishing/restructuring of shorthand code snippets or fragments into complete technical interview questions.

### 3. `POST /api/generate-study-guide`
Consolidates matched questions. Leverages Llama-3.1-8b-instruct to de-duplicate, format, and filter guides by study topics.

### 4. `POST /api/fetch-community-questions`
Pulls data from active external forums (Reddit & StackOverflow) and parses relevant QA content matching SDET experience limits.

### 5. `GET/POST /api/posts` & `GET/POST /api/boards` & `GET/POST /api/activity`
Sync data records inside the `data/` project directory.
