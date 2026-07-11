import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), '.temp-imports');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const content = formData.get('content') || '';
    const author = formData.get('author') || '';
    const url = formData.get('url') || '';

    if (!content) {
      return new Response('Error: No content received.', { status: 400 });
    }

    const importId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const data = {
      content: content.toString().trim(),
      author: author.toString().trim(),
      url: url.toString().trim(),
    };

    // Save to temp file
    fs.writeFileSync(
      path.join(TEMP_DIR, `${importId}.json`),
      JSON.stringify(data, null, 2),
      'utf-8'
    );

    // Redirect user to the main app page with the import ID
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/?import_id=${importId}`, 303);
  } catch (err) {
    console.error('Error in receive-post-form:', err);
    return new Response(`Error processing request: ${err.message}`, { status: 500 });
  }
}
