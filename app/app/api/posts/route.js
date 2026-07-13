import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');
const ACTIVITY_FILE = path.join(DATA_DIR, 'activity.json');

const DEFAULT_TAGS = ['Java', 'Javascript', 'Selenium', 'Automation', 'Manual', 'Playwright', 'Nightwatch', 'API Testing', 'General'];
const DEFAULT_BOARDS = [{ id: 'default', name: 'General Prep', questions: [] }];
const DEFAULT_ACTIVITY = { studyDates: {}, targetDate: '', dailyGoal: 5 };

// Helper to ensure data directory and files exist
function initDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(POSTS_FILE)) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!fs.existsSync(TAGS_FILE)) {
    fs.writeFileSync(TAGS_FILE, JSON.stringify(DEFAULT_TAGS, null, 2), 'utf-8');
  }
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ nvidiaKey: '' }, null, 2), 'utf-8');
  }
  if (!fs.existsSync(BOARDS_FILE)) {
    fs.writeFileSync(BOARDS_FILE, JSON.stringify(DEFAULT_BOARDS, null, 2), 'utf-8');
  }
  if (!fs.existsSync(ACTIVITY_FILE)) {
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(DEFAULT_ACTIVITY, null, 2), 'utf-8');
  }
}

export async function GET() {
  try {
    initDataFiles();

    const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
    const tags = JSON.parse(fs.readFileSync(TAGS_FILE, 'utf-8'));
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));

    return Response.json({
      success: true,
      posts,
      tags,
      config
    });
  } catch (err) {
    console.error('Failed to load project data:', err);
    return Response.json({ error: 'Failed to load project data.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    initDataFiles();
    const { posts, tags, config } = await request.json();

    if (posts !== undefined) {
      fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
    }
    if (tags !== undefined) {
      fs.writeFileSync(TAGS_FILE, JSON.stringify(tags, null, 2), 'utf-8');
    }
    if (config !== undefined) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Failed to save project data:', err);
    return Response.json({ error: 'Failed to save project data.' }, { status: 500 });
  }
}
