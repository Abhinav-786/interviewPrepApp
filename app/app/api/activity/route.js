import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ACTIVITY_FILE = path.join(DATA_DIR, 'activity.json');
const DEFAULT_ACTIVITY = { studyDates: {}, targetDate: '', dailyGoal: 5 };

function initActivityFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ACTIVITY_FILE)) {
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(DEFAULT_ACTIVITY, null, 2), 'utf-8');
  }
}

export async function GET() {
  try {
    initActivityFile();
    const data = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf-8'));
    return Response.json({ success: true, activity: data });
  } catch (err) {
    console.error('Failed to load study activity data:', err);
    return Response.json({ error: 'Failed to load study activity.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    initActivityFile();
    const payload = await request.json();
    
    // Read current data to preserve unsubmitted fields if any
    const currentData = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf-8'));
    
    const updatedData = {
      studyDates: payload.studyDates !== undefined ? payload.studyDates : currentData.studyDates,
      targetDate: payload.targetDate !== undefined ? payload.targetDate : currentData.targetDate,
      dailyGoal: payload.dailyGoal !== undefined ? parseInt(payload.dailyGoal, 10) : currentData.dailyGoal,
    };
    
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(updatedData, null, 2), 'utf-8');
    return Response.json({ success: true, activity: updatedData });
  } catch (err) {
    console.error('Failed to save study activity data:', err);
    return Response.json({ error: 'Failed to save study activity.' }, { status: 500 });
  }
}
