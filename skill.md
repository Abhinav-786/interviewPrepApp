# Skills — InterviewPrepApp

This document catalogues the active **technical capabilities, skills, and integrations** built into this codebase. Use this as a reference when onboarding, extending, or maintaining features.

---

## Skill Index

| # | Skill | Focus Area | Status |
|---|---|---|---|
| S01 | Client-Side Bookmarklet Data Grab | Browser Redirection | ✅ Active |
| S02 | NVIDIA meta/llama-3.1-8b-instruct AI Integration | Chat Completions | ✅ Active |
| S03 | Company & Tag Suggestion Engine | AI Automation | ✅ Active |
| S04 | AI-Consolidated Study Prep Generator | LLM Data Processing | ✅ Active |
| S05 | Filesystem JSON Database | Data Persistence | ✅ Active |
| S06 | Auto-Migration State Loader | Data Transition | ✅ Active |
| S07 | Multi-Tag Filter & Chip Styling | Frontend UI/UX | ✅ Active |
| S08 | Full Post details Modal Viewer | Frontend UI/UX | ✅ Active |
| S09 | Inline Dashboard Editor Modal | Frontend UI/UX | ✅ Active |
| S10 | Dynamic HSL Chip Color hashing | Frontend / CSS | ✅ Active |

---

## S01 — Client-Side Bookmarklet Data Grab

**Files:**
* Bookmarklet Script: Compiled inside `app/app/page.js` (`copyBookmarklet`)
* Target Endpoint: `app/app/api/receive-post-get/route.js`

**Capability:**
Bypasses LinkedIn scrapers and CORS blocks by reading LinkedIn post HTML directly inside the user's active, authenticated browser tab and sending it to the app via a GET redirect.
* Automatically serializes page content text, author name, and source URLs.
* Transfers data safely across secure contexts via `window.open` redirects.
* Caches data temporarily inside `.temp-imports/` and handles cleanups immediately after the redirect loads.

---

## S02 — NVIDIA meta/llama-3.1-8b-instruct AI Integration

**Files:**
* Manual Extraction: `app/app/api/extract-questions/route.js`
* Consolidation: `app/app/api/generate-study-guide/route.js`

**Capability:**
Leverages the NVIDIA meta/llama-3.1-8b-instruct completions API to parse raw conversation-style social media posts, stripping away greetings, personal chatter, and formatting them into structured lists of questions.
* Configured with strict prompt patterns to preserve header sections (e.g. "Java", "WebDriver") and groups.
* Set with 60–90 second network timeout abort signals to support large question collection arrays without timing out.

---

## S03 — Company & Tag Suggestion Engine

**Files:**
* API Parser: `app/app/api/extract-questions/route.js`
* Bookmarklet Parser: `app/app/api/receive-post-get/route.js`

**Capability:**
AI automatically performs entity extraction on text blocks:
* **Company Detection**: Detects company names (e.g., Barclays, Deloitte) mentioned in the text and maps them to the post metadata.
* **Tag Matching**: Suggests relevant tags matching your active tags list.
* **Tag Auto-Creation**: Recommends short new tags (e.g., SQL, Jenkins, Git) if new topics are found in the questions list.

---

## S04 — AI-Consolidated Study Prep Generator

**File:** `app/app/api/generate-study-guide/route.js`

**Capability:**
Compiles custom-focused study prep sheets by scanning matching topics and keywords.
* Merges raw questions collected from all matched posts.
* Instructs the LLM completions endpoint to de-duplicate matching/repeating questions.
* Formats the final output into a single, clean study guide grouped by sub-headings, exportable as Markdown files or clip text.

---

## S05 — Filesystem JSON Database

**File:** `app/app/api/posts/route.js`

**Capability:**
Stores all application states directly inside your codebase (`app/data/`) to enable seamless cloning across devices, cross-browser data sharing, and git version tracking.
* **`posts.json`**: Stores array of all collected posts and questions.
* **`tags.json`**: Stores array of all registered topic tags.
* **`config.json`**: Stores custom NVIDIA API keys (git-ignored to protect secret credentials).
* Changes to dashboard state automatically update these filesystem JSON files in the background.
