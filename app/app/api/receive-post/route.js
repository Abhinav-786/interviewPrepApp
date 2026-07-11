/**
 * /api/receive-post
 * 
 * Receives post content sent from the browser bookmarklet.
 * Forwards the data to /api/pending-post which the UI polls.
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { content, author, url } = body;

    if (!content) {
      return Response.json({ error: 'No content provided' }, { status: 400 });
    }

    // Forward to the pending-post store
    const origin = new URL(request.url).origin;
    await fetch(`${origin}/api/pending-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, author, url }),
    });

    return Response.json({ success: true }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (err) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
