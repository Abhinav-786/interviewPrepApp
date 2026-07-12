# Architecture — InterviewPrepApp

## Overview

InterviewPrepApp is a **Next.js 16** web application designed to help users collect, catalog, edit, and organize LinkedIn interview preparation questions. It features automated AI-driven question and company name extraction, multi-tag categorization, and a study prep generator that uses AI to consolidate questions from multiple posts into a single unified prep sheet.

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
│   │  • /api/extract-questions → Manual AI questions & tags extraction    │   │
│   │  • /api/posts             → Reads/Writes files inside local database  │   │
│   │  • /api/generate-study-guide → AI-based question consolidation       │   │
│   └───────────┬──────────────────────────────────────────────────────────┘   │
└───────────────┼──────────────────────────────────────────────────────────────┘
                │ requests completions
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
├── skill.md                ← Skills catalogue (bookmarklet, AI, database)
└── app/                    ← Next.js application root
    ├── next.config.mjs     ← Next.js configurations
    ├── package.json        ← Frontend npm packages
    ├── data/               ← Project Filesystem Database (Commited to Git)
    │   ├── posts.json      ← Saved posts, company metadata, and questions list
    │   ├── tags.json       ← Saved list of active categories / tags
    │   └── config.json     ← Stored configs (API keys - Git Ignored for security)
    ├── app/
    │   ├── layout.js       ← Main HTML layout + page head styling
    │   ├── globals.css     ← Cohesive styling system variables and tags
    │   ├── page.js         ← All dashboard UI states, modals, and templates
    │   └── api/
    │       ├── receive-post-get/
    │       │   └── route.js   ← Redirect target for the LinkedIn bookmarklet
    │       ├── pending-post/
    │       │   └── route.js   ← Temporary file read & cleanup endpoint
    │       ├── extract-questions/
    │       │   └── route.js   ← Manual AI extraction completions fetcher
    │       ├── posts/
    │       │   └── route.js   ← Filesystem JSON database read/write routes
    │       └── generate-study-guide/
    │           └── route.js   ← AI study guide consolidation completions
    └── public/
```

---

## Component Architecture

### `app/page.js` (Client Component)

All UI state lives in-memory here and triggers page render dynamically. Key components:

| Component / Function | Role |
|---|---|
| `Home()` | Main dashboard - manages page sorting, active tab, filtering, search keywords, and modal state management. |
| `AddPostModal()` | Dynamic modal supporting both ADD and EDIT modes. Features manual inputs, tag toggling, and manual AI questions extraction buttons. |
| `ViewPostModal()` | Visual modal displaying formatted question listings, status badges, and source links. Features copy-to-clipboard actions. |
| `Toast()` | Auto-dismissing floating alert notifications. |
| `SortTh()` | Sortable column header cells with ascending/descending directional tags. |
| `getTagStyle(tag)` | Computes cohesive HSL colors dynamically from the tag string text. |
| `toCSV(posts)` | Serializes target posts list to double-quoted escaped CSV rows. |

### State Management

All state is loaded on React mount from the backend filesystem API and synchronized when changes occur:

| State Key | Type | Purpose |
|---|---|---|
| `posts` | `Array<Post>` | Loaded posts database. Syncs back to `/data/posts.json` on changes. |
| `tags` | `Array<string>` | Active tag list. Syncs back to `/data/tags.json` on changes. |
| `nvidiaKey` | `string` | Custom NVIDIA key configuration. Syncs back to `/data/config.json`. |
| `activeTab` | `'sheet'|'prep'` | Toggles between Sheet Dashboard and study guide compiler views. |
| `prepSelectedTags` | `Array<string>` | Active topic filter tags inside the Prep Generator tab. |
| `prepKeywords` | `string` | Search query keywords to scan inside the Prep Generator tab. |
| `prepGuide` | `string` | Compiled Markdown study guide returned from the NVIDIA AI completions call. |

### Data Shape — `Post` Object

```json
{
  "id":       "post_1783725191804_u8c4f",
  "url":      "https://www.linkedin.com/posts/...",
  "author":   "Company Name (e.g. Barclays)",
  "content":  "Clean extracted questions text...",
  "tags":     ["Java", "Selenium", "Automation"],
  "status":   "To Read",
  "addedAt":  "2026-07-10T23:13:11.804Z"
}
```

---

## API Endpoints

### 1. `GET /api/receive-post-get`
Called by the browser bookmarklet on LinkedIn. Extracts page content/metadata, requests meta/llama-3.1-8b-instruct to automatically extract the interview questions/company/tags, writes them temporarily to `.temp-imports/` and redirects the user to `/?import_id=...`.

### 2. `GET /api/pending-post?id=<import_id>`
Fetches the pre-filled post data from `.temp-imports/` on load, and deletes the temp file from disk.

### 3. `POST /api/extract-questions`
Invoked manually when clicking **🪄 Extract Questions only** in the modal. Queries the NVIDIA API to clean questions list and detect company/topic tags.

### 4. `GET /api/posts`
Reads `posts.json`, `tags.json`, and `config.json` inside the `data/` directory and returns them to the frontend on mount.

### 5. `POST /api/posts`
Persists the updated list of posts, tags, or API key configuration directly to the filesystem JSON files.

### 6. `POST /api/generate-study-guide`
Sends all matched questions text from your filters to the NVIDIA completions API. The AI consolidates, de-duplicates similar questions, and structures them into a formatted Markdown study sheet grouped by sub-topics.

---

## Styling System

`globals.css` uses HSL CSS variables for dark-mode glassmorphism accents. HSL color ranges computed at runtime ensure that tag styling is uniform and infinitely expandable without static styles:
```css
background: hsla(hue, 65%, 65%, 0.15);
color: hsla(hue, 80%, 75%, 1);
border: 1px solid hsla(hue, 65%, 65%, 0.3);
```
