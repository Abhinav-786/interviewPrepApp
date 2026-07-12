# Memory — InterviewPrepApp

This file acts as the **persistent memory** for AI agents and developers working on this project. It captures key decisions, patterns, gotchas, and current state so any agent can pick up context instantly.

---

## Current State (Last Updated: 2026-07-12)

### What's Built
* ✅ **Next.js 16 App**: Bootstrapped and running in `./app/`.
* ✅ **Project Filesystem Database**: Stores all posts (`posts.json`), topic tags (`tags.json`), and git-ignored user keys (`config.json`) inside a single local `app/data/` folder. Auto-synchronizes with the client via a `/api/posts` endpoint.
* ✅ **Automatic Data Migration**: Automatically migrates any legacy browser localStorage posts and tags into the filesystem files on first page refresh.
* ✅ **LinkedIn Bookmarklet Redirection**: Solves CORS and mixed-content browser sandbox constraints by redirecting the user via GET from LinkedIn to `/api/receive-post-get?content=...`, which saves the data and redirects back to the app page with a temporary `import_id`.
* ✅ **NVIDIA API AI Question Extraction**: Automatically runs upon bookmarklet import or manually inside the modal via the **`meta/llama-3.1-8b-instruct`** model on NVIDIA completions endpoint (`https://integrate.api.nvidia.com/v1`). Cleans raw text into lists of questions, filters chat greetings, and preserves category group headers.
* ✅ **🏢 Company Name Extraction**: AI detects company names (e.g. *Barclays*, *Cognizant*) mentioned in the post and pre-fills the Company Name input automatically.
* ✅ **🏷 AI Tag Suggestion & Selection**: AI scans questions, matches existing topics, and recommends/auto-creates new tags (e.g. `Git`, `XPath`, `Jenkins`), auto-selecting them on modal load.
* ✅ **🎯 Consolidated Study Guide Generator**: Switches to a Study Prep tab to compile questions. The AI merges matched questions from all selected tags and keywords, **removes duplicates**, and returns **one single master study guide** grouped by topic headers. The guide can be copied or downloaded as a Markdown file.
* ✅ **📊 Study Progress Tracker**: A dedicated third tab layout acting as an interactive Kanban board. Clicking **Track Study Progress** under any generated guide automatically parses questions into individual cards split across **To Do**, **In Progress**, and **Done** columns. Includes a custom question adder, horizontal progress stats, and direct browser `localStorage` persistence.
* ✅ **Full Post Details Modal**: Click any post content or action eye (`👁`) to view formatted questions lists, company details, URLs, and copy questions easily.
* ✅ **✏️ Inline Edit Modal**: Click the pencil icon (`✏️`) to modify companies, links, tags, and raw questions text, saving them instantly.
* ✅ **Sort, Cycle, Search**: Click column headers to sort, cycle status badges (To Read -> In Progress -> Done), and search across companies, tags, and raw post contents.
* ✅ **Security & Clean Code**: Legacy unused scraper API folders (`app/app/api/scrape` and `app/app/api/login-browser`) have been deleted, ensuring the Next.js app compiles successfully. Unused dependencies `puppeteer-core` and `node-html-parser` have been uninstalled. Private keys in `/data/config.json` are git-ignored.

---

## Technical Decisions Log

### 1. File Storage over LocalStorage
* **Decision**: Migrate from client `localStorage` to local files in `app/data/`.
* **Reason**: Saves user data directly in the repository so it clones easily across devices, bypasses 5MB browser storage limits, and can be backed up via Git.
* **Gotcha**: `/data/config.json` containing the personal API keys MUST be ignored in `.gitignore` to prevent secret leaks, while `posts.json` and `tags.json` remain tracked.

### 2. Client-Side Bookmarklet for LinkedIn Grab
* **Decision**: Use a GET redirect bookmarklet from the client browser.
* **Reason**: LinkedIn auth walls and anti-bot scrape protections block headless Puppeteer scrapers, and CORS restricts direct HTTPS -> HTTP localhost fetch requests.
* **Gotcha**: Browsers block Programmatic POST forms from HTTP pages in HTTPS secure contexts. Standard GET redirects (`window.open`) are the most reliable way to transfer text across domains.

### 3. Study Guide Question Consolidation & Pre-Filtering Optimization
* **Decision**: Pre-filter matching questions locally and extract question-level tags inside the JSON database.
* **Reason**: Reduces prompt payload sent to NVIDIA API by 70% to 90%, preventing API timeouts and boosting study guide generation speed.
* **Gotcha**: If a legacy post is loaded, dynamically split its content block into individual questions at runtime using the post's first tag as its default topic category.

### 4. Progress Tracker Question Parsing
* **Decision**: Automatically parse questions from the compiled Markdown guide.
* **Reason**: Avoids forcing the user to manually copy-paste or create tracking cards. A regex detects standard lists and groups them under the respective Markdown subtopic headers.

---

## File Locations Quick Reference

| File | Purpose |
|---|---|
| `/app/app/page.js` | Main React Dashboard layout, active state hooks, and Modals. |
| `/app/data/posts.json` | JSON file database containing posts, company metadata, and questions. |
| `/app/data/tags.json` | JSON list of default and custom created tags. |
| `/app/data/config.json` | Stores private NVIDIA API key (Git Ignored). |
| `/app/app/api/posts/route.js` | Backend FS route handlers to load/save JSON database files. |
| `/app/app/api/generate-study-guide/route.js` | AI-consolidation handler. |
| `/app/app/api/extract-questions/route.js` | AI question extraction handler. |
| `/app/app/api/receive-post-get/route.js` | Bookmarklet import target handler. |

---

## Conversation History Summary

* **Session 1–6**: Initial project setup, basic UI table, and experimental Puppeteer scraper setups.
* **Session 7**: Solved LinkedIn scraping blocks using the client-side bookmarklet redirect.
* **Session 8**: Integrated NVIDIA completions API (`z-ai/glm-5.2` model) to automatically extract questions, detect company names, and suggest tags. Enabled Multi-Tag tags and click-to-view post modals.
* **Session 9**: Implemented inline post editor. Created consolidated Study Prep Generator tab compile. Migrated database to local filesystem JSON files under the `app/data/` folder with automatic first-load data migration. Cleaned legacy scraper files and uninstalled unused packages.
* **Session 10**: Added Study Progress Tracker tab that parses compiled study guides into an interactive Kanban board with localStorage persistence. Cleaned legacy scraper route files (`scrape` and `login-browser`) to resolve compilation build errors.
* **Session 11**: Switched API routes to use the official OpenAI SDK client wrapper targeting your new NVIDIA credentials. Implemented question-level tagging and pre-filtering optimizations to eliminate API generation latency. Added robust checklist parser filters, the new View Task Details / Study Notes modal, the AI expert answer coach, ran a comprehensive database migration script to polish and restructure all shorthand questions into professional complete technical interview questions, and updated the extraction prompts in both `extract-questions` and `receive-post-get` endpoints to enforce this same AI validation and professional polishing upon any new manual or bookmarklet imports.
