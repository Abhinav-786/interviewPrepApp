# Skills — InterviewPrepApp

This document catalogues the active **technical capabilities, skills, and integrations** built into this codebase. Use this as a reference when onboarding, extending, or maintaining features.

---

## Skill Index

| # | Skill | Focus Area | Status |
|---|---|---|---|
| S01 | Client-Side Bookmarklet Data Grab | Browser Redirection | ✅ Active |
| S02 | NVIDIA meta/llama-3.1-8b-instruct AI | Chat Completions | ✅ Active |
| S03 | Company & Tag Suggestion Engine | AI Automation | ✅ Active |
| S04 | AI-Consolidated Study Prep Generator | LLM Data Processing | ✅ Active |
| S05 | Interactive Kanban Tracker Board | Frontend UI/UX | ✅ Active |
| S06 | AI-Evaluated Mock Interviews | AI / Speech / Evaluation | ✅ Active |
| S07 | 3D Flipping Flashcards | Frontend UI/UX | ✅ Active |
| S08 | Focus Timer & Notification Engine | Audio / Notifications | ✅ Active |
| S09 | Community QA Feed Fetcher | Data Fetching | ✅ Active |
| S10 | Activity Heatmap & Goal Tracker | Analytics / Visualization | ✅ Active |
| S11 | Light & Dark Theme Design Tokens | CSS Themes | ✅ Active |
| S12 | Filesystem JSON Databases | Data Persistence | ✅ Active |

---

## S05 — Interactive Kanban Tracker Board

**Files:**
* Component: `app/components/TrackerTab.js`
* Task Modal: `app/components/TrackerTaskModal.js`
* Endpoint: `app/app/api/boards/route.js`

**Capability:**
Allows users to track study progress by organizing questions into Kanban boards split across **To Do**, **In Progress**, and **Done** columns.
* Supports drag-and-drop or click-based status transitions.
* Supports adding category-specific questions directly on the boards.
* Tracks user focus: features a Focus Monitor that alerts the user with synthesized sound chimes if no card status is updated for 10 minutes.

---

## S06 — AI-Evaluated Mock Interviews

**Files:**
* Component: `app/components/MockInterviewTab.js`
* Evaluation Prompt: Configured inside the component calling NVIDIA completions.

**Capability:**
Simulates real-world technical screens for SDET/QA candidates:
* Generates a set of 5 random questions from a selected study board.
* Accepts text-based or speech-to-text answers (using the Web Speech API).
* Calls the NVIDIA Llama-3.1-8b-instruct API to grade answers, evaluate code syntax, suggest corrections, and generate a structured grading scorecard.

---

## S07 — 3D Flipping Flashcards

**File:** `app/components/FlashcardsTab.js`

**Capability:**
Enables rapid self-testing using interactive 3D cards:
* Cycles through questions in any selected study board.
* Leverages CSS 3D transforms (`preserve-3d`, `rotateY`, `backface-visibility`) to flip cards on click.
* Provides a quick AI Help helper directly on the card back to generate expert explanations for the question.

---

## S08 — Focus Timer & Notification Engine

**File:** `app/components/FocusClockTab.js`

**Capability:**
A study helper representing Pomodoro mechanics:
* Configures study sessions (e.g., 25-minute work block, 5-minute break).
* Automatically plays sound chimes (using synthesized Web Audio API nodes) when intervals finish.
* Sends automated browser Push Notifications (via HTML5 Notifications API) to alert the user even if they are in a different tab.
* Triggers task-update reminders every 10 minutes of active work time.

---

## S09 — Community QA Feed Fetcher

**Files:**
* Component: `app/components/CommunityQuestionsFetcher.js`
* Endpoint: `app/app/api/fetch-community-questions/route.js`

**Capability:**
Fetches real interview questions from developer communities:
* Queries active Reddit and StackOverflow subreddits/tags for SDET and QA topics.
* Filters questions based on experience level (Entry, Mid, Senior).
* Parses title, body text, and links, allowing the user to select and import them directly into study boards.

---

## S10 — Activity Heatmap & Goal Tracker

**Files:**
* Dashboard Component: `app/components/DashboardTab.js`
* Endpoint: `app/app/api/activity/route.js`

**Capability:**
Tracks and visualizes preparation metrics:
* Renders a calendar heatmap tracking dates of study activity (based on tasks marked as Done).
* Computes progress metrics and countdown gauges toward target exam dates.
* Manages daily preparation goals (e.g., target cards completed per day).
