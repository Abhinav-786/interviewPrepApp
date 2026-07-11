/**
 * /api/oembed
 * Fetches LinkedIn post metadata via the official LinkedIn oEmbed API.
 * LinkedIn's oEmbed endpoint returns: author_name, author_url, html (embed snippet), etc.
 * This is free and requires no API key.
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const postUrl = searchParams.get('url');

  if (!postUrl) {
    return Response.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate it's a LinkedIn URL
  if (!postUrl.includes('linkedin.com')) {
    return Response.json({ error: 'URL must be a LinkedIn URL' }, { status: 400 });
  }

  try {
    const oembedEndpoint = `https://www.linkedin.com/oembed?url=${encodeURIComponent(postUrl)}&format=json`;

    const res = await fetch(oembedEndpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InterviewPrepBot/1.0)',
        Accept: 'application/json',
      },
      // Timeout after 8 seconds
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return Response.json(
        { error: `LinkedIn oEmbed returned ${res.status}. Try pasting the content manually.` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    console.error('[/api/oembed] Error:', err.message);
    return Response.json(
      { error: 'Could not fetch post info. Paste the content manually.' },
      { status: 500 }
    );
  }
}
