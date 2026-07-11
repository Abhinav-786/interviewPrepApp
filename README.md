# LinkedIn Interview Prep Sheet

A local technical interview preparation tracker and consolidated study guide generator. This app lets you grab interview questions directly from LinkedIn posts via a custom bookmarklet, clean and catalog them using NVIDIA AI, organize them with multiple topic tags, track your progress, and compile them into master study sheets.

## 🚀 Key Features

* **⚡ Zero-Click AI Question Extraction**: Bypasses LinkedIn authentication walls using a custom browser bookmarklet. The bookmarklet automatically grabs post contents and forwards them to a local server which uses the **NVIDIA AI completions API (`z-ai/glm-5.2` model)** to extract clean, formatted technical questions.
* **🏢 Company & Tag Auto-Population**: The AI automatically detects what company name is mentioned in the post and recommends relevant study topics/tags, pre-filling them instantly when you save.
* **🎯 Unified Study Prep Generator**: Compile a single, consolidated master guide from matching tags or keywords. The AI automatically **de-duplicates repeating questions** and organizes them logically into sub-topics (e.g. *Java Core*, *Selenium WebDriver*, *SQL Database*, *API Testing*) into a formatted Markdown study guide.
* **💾 Project-Level JSON Database**: All data is saved inside the codebase in the `app/data/` folder, allowing you to easily push your study sheets to Git and access them across multiple devices or different web browsers.
* **🏷 Multi-Tag Filters**: Tag questions with multiple categories simultaneously (e.g. `Java`, `Selenium`, `TestNG`) and filter your dashboard matching all or specific tags.
* **📖 Full Details Viewer & Inline Editor**: View post metadata, source URLs, and full lists of questions. Modify companies, URLs, tags, or question descriptions directly inside the app with the Pencil Edit tool.
* **📥 CSV & Markdown Exports**: Export your sheet as a CSV spreadsheet or download compiled AI study guides as structured Markdown files.

---

## 🛠 Getting Started

### 1. Installation
Clone the repository, enter the `app` directory, and install dependencies:
```bash
cd app
npm install
```

### 2. Configure NVIDIA API Key
Create or update the file `app/data/config.json` inside your project root and add your personal NVIDIA API Key:
```json
{
  "nvidiaKey": "your-nvapi-key-here"
}
```
*Note: `/data/config.json` is configured in `.gitignore` so your private API key will never be accidentally pushed to GitHub.*

### 3. Run Development Server
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to see the dashboard.

---

## 📋 Using the LinkedIn Bookmarklet

To collect questions from LinkedIn posts with one click:
1. Open the web app dashboard at [http://localhost:3000](http://localhost:3000).
2. Click **+ Add Post** in the top right.
3. Click the **"📋 Copy Bookmarklet Code"** button (or click and select the bookmarklet script in the box).
4. Create a new bookmark in your browser bar (e.g., name it `Grab Post`).
5. Edit the bookmark and paste the copied bookmarklet code into the **URL / Address** field.
6. **To use**: Go to any LinkedIn post containing interview questions and click your bookmark. It will automatically grab the content, extract the questions, auto-detect the company/tags, and open the pre-filled modal in a new tab!

---

## 📂 Project Data Directory Structure

Your data is stored locally in the project under the **`app/data/`** folder:
* **`posts.json`**: Stores the list of interview posts, questions, links, dates, and statuses.
* **`tags.json`**: Stores the list of default and custom tags you create.
* **`config.json`**: Stores configurations (like custom API keys) and is git-ignored for safety.
