import fs from 'fs';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), '.temp-imports');

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const filePath = path.join(TEMP_DIR, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return Response.json({ error: 'Post not found or already imported' }, { status: 404 });
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Clean up file after successful read so we don't leak files
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Failed to delete temp file:', e);
    }

    return Response.json(data);
  } catch (err) {
    return Response.json({ error: 'Failed to read data' }, { status: 500 });
  }
}
