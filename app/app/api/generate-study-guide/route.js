/**
 * /api/generate-study-guide
 * 
 * Uses NVIDIA completions API to consolidate, de-duplicate, and organize
 * interview questions from multiple posts into a single unified prep sheet.
 * Strictly filters questions by selected topics/tags.
 */

const DEFAULT_API_KEY = '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';
const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'z-ai/glm-5.2';

export async function POST(request) {
  try {
    const { content, topics, apiKey } = await request.json();

    if (!content || !content.trim()) {
      return Response.json({ error: 'No content to generate guide from.' }, { status: 400 });
    }

    const key = apiKey?.trim() || process.env.NVIDIA_API_KEY || DEFAULT_API_KEY;
    
    if (!key) {
      return Response.json({ error: 'Missing API Key.' }, { status: 400 });
    }

    const prompt = `You are an expert technical interviewer and SDET / QA recruiter. Your task is to analyze the following collection of interview questions gathered from multiple different LinkedIn posts.

Selected Topics to Filter By: ${topics || 'General'}

Consolidate and compile them into ONE single, master study sheet.

Rules:
1. STRICT TOPIC RELEVANCE: Keep ONLY the questions that are relevant to the Selected Topics ("${topics || 'General'}"). If a question in the source content is NOT related to these selected topics, completely discard it. Do not include it in the final guide.
2. De-duplicate: If the same or very similar questions are present in multiple posts, merge them into a single, well-phrased question.
3. Group and Categorize: Group the consolidated questions logically by sub-topic (e.g., "Java Core Concepts", "Selenium WebDriver Commands", "API Testing & Rest Assured", "SQL & Database", etc.). Use clear headings.
4. Clean Formatting: Return the questions in a clean, professional markdown format. Do not include any introductory greeting, chatty explanations, or sign-offs. Start directly with the compiled guide.

Raw Questions from Multiple Posts:
${content}`;

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        top_p: 1,
        max_tokens: 8192,
      }),
      signal: AbortSignal.timeout(90000), // 90s timeout
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('NVIDIA Study Guide API Error:', errText);
      return Response.json({ error: 'Failed to consolidate questions. Please try again.' }, { status: response.status });
    }

    const data = await response.json();
    const consolidatedText = (data.choices?.[0]?.message?.content || '').trim();

    return Response.json({
      success: true,
      guide: consolidatedText,
    });
  } catch (err) {
    console.error('Study Guide Handler Error:', err);
    return Response.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
