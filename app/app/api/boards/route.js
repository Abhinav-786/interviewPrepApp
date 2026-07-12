import fs from 'fs';
import path from 'path';

/**
 * /api/boards
 *
 * GET  — returns all tracker boards from data/boards.json
 * POST — saves boards array to data/boards.json
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');

const DEFAULT_BOARDS = [
  {
    id: 'default',
    name: 'General Prep',
    questions: []
  }
];

function initBoardsFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BOARDS_FILE)) {
    fs.writeFileSync(BOARDS_FILE, JSON.stringify(DEFAULT_BOARDS, null, 2), 'utf-8');
  }
}

export async function GET() {
  try {
    initBoardsFile();
    const boards = JSON.parse(fs.readFileSync(BOARDS_FILE, 'utf-8'));
    return Response.json({ success: true, boards });
  } catch (err) {
    console.error('Failed to load boards:', err);
    return Response.json({ error: 'Failed to load boards.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    initBoardsFile();
    const { boards } = await request.json();

    if (!Array.isArray(boards)) {
      return Response.json({ error: 'Invalid boards payload — expected an array.' }, { status: 400 });
    }

    fs.writeFileSync(BOARDS_FILE, JSON.stringify(boards, null, 2), 'utf-8');
    return Response.json({ success: true });
  } catch (err) {
    console.error('Failed to save boards:', err);
    return Response.json({ error: 'Failed to save boards.' }, { status: 500 });
  }
}
