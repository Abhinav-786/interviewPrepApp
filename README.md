# LinkedIn Interview Prep Sheet & SDET Co-Pilot

A technical interview preparation tracker, interactive study board, and mock interview companion. Grab interview questions directly from LinkedIn posts via a custom bookmarklet, organize them into category boards, track progress using Kanban boards, test your knowledge with 3D flashcards, simulate AI-evaluated mock interviews, and fetch live community QA resources from Reddit & StackOverflow—all powered by **NVIDIA AI Llama-3.1-8b-instruct** integrations.

---

## 🚀 Key Features

* **⚡ Zero-Click AI Question Extraction**: Bypasses LinkedIn authentication walls using a custom browser bookmarklet. The bookmarklet grabs post contents and forwards them to a local server which uses the **NVIDIA AI completions API (`meta/llama-3.1-8b-instruct` model)** to extract clean, grammatically polished, professional technical questions.
* **📅 Progress Tracker (Kanban Board)**: Create dedicated study boards (e.g., *Java and OOPs learning*, *Selenium learning*) and track your preparation status across **To Do**, **In Progress**, and **Done** columns. Easily add, edit, or remove questions directly on the board.
* **🎴 3D Flipping Flashcards**: Study questions category-by-category using interactive 3D flipping card animations. View the question on the front, flip it to write study notes, or query the AI Coach for help.
* **🎙️ AI Mock Interview Simulation**: Conduct mock interviews powered by AI. Answer questions using speech or typing, receive immediate constructive feedback, and get an overall performance score evaluation with an expert answer analysis.
* **🌐 Community Questions Fetcher**: Pull real-time SDET/QA interview questions from Reddit & StackOverflow, filtered by experience level, and import them directly into your Kanban boards.
* **🔥 Daily Goals & Heatmap Calendar**: Log study activities to visualize preparation streaks. Track target dates, countdown metrics, and progress gauges against your daily goals.
* **⏱️ Pomodoro Focus Timer**: Lifted Pomodoro focus clock with customizeable work/break session triggers and automatic chiming notifications to remind you to update task statuses.
* **🏢 Company & Tag Auto-Population**: The AI automatically detects what company name is mentioned in the post and recommends relevant study topics/tags, pre-filling them instantly when you save.
* **🎯 Unified Study Prep Generator**: Compile a single, consolidated master guide from matching tags or keywords. The AI automatically **de-duplicates repeating questions** and organizes them logically into sub-topics (e.g. *Java Core*, *Selenium WebDriver*, *SQL Database*, *API Testing*) into a formatted Markdown study guide.
* **🌓 Light & Dark Theme Support**: Sleek, glassmorphism design system supporting smooth dark-mode and light-mode rendering toggle buttons.
* **💾 Project-Level JSON Database**: All data is saved inside the codebase in the `app/data/` folder, allowing you to easily push your study sheets and boards to Git and access them across multiple devices or different web browsers.

---

## 🛠 Getting Started

### 1. Installation
Clone the repository, enter the `app` directory, and install dependencies:
```bash
cd app
npm install
```

### 2. Configure NVIDIA API Key
Set your personal NVIDIA API Key inside your terminal environment (or in a `.env` file at `app/.env`):
```env
NVIDIA_API_KEY=your-nvapi-key-here
```
*Note: Make sure your server has access to `process.env.NVIDIA_API_KEY` for AI extractions, guide consolidation, and mock evaluations.*

### 3. Run Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to see the dashboard.

---

## 📋 Using the LinkedIn Bookmarklet

To collect questions from LinkedIn posts with one click:
1. Open the web app dashboard at [http://localhost:3000](http://localhost:3000).
2. Go to **Study Resources** and click **+ Add Post**.
3. Click the **"📋 Copy Bookmarklet Code"** button.
4. Create a new bookmark in your browser bar (e.g., name it `Grab Post`).
5. Edit the bookmark and paste the copied bookmarklet code into the **URL / Address** field.
6. **To use**: Go to any LinkedIn post containing interview questions and click your bookmark. It will automatically grab the content, extract the questions, auto-detect the company/tags, and open the pre-filled modal in a new tab!

---

## 📂 Project Data Directory Structure

Your data is stored locally in the project under the **`app/data/`** folder:
* **`posts.json`**: Stores the list of interview posts, questions, links, dates, and statuses.
* **`boards.json`**: Stores your interactive study boards and lists of Kanban cards.
* **`activity.json`**: Stores study activity tracking metrics (dates, daily goals, and target dates).
* **`tags.json`**: Stores the list of default and custom tags you create.
* **`config.json`**: Stores configurations (like custom API keys) and is git-ignored for safety.
