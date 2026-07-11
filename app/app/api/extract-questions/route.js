/**
 * /api/extract-questions
 * 
 * Uses OpenAI-compatible NVIDIA completion API to extract company name,
 * interview questions, and relevant tags matching the questions.
 */

const DEFAULT_API_KEY = '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';
const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'z-ai/glm-5.2';

const DEFAULT_TAGS = ['Java', 'Javascript', 'Selenium', 'Automation', 'Manual', 'Playwright', 'Nightwatch', 'API Testing', 'General'];

export async function POST(request) {
  try {
    const { content, apiKey, availableTags } = await request.json();

    if (!content || !content.trim()) {
      return Response.json({ error: 'No content provided' }, { status: 400 });
    }

    const key = apiKey?.trim() || process.env.NVIDIA_API_KEY || DEFAULT_API_KEY;
    
    if (!key) {
      return Response.json({
        error: 'Missing API Key.',
        needsKey: true
      }, { status: 400 });
    }

    const tagsListStr = (availableTags || DEFAULT_TAGS).join(', ');

    const prompt = `You are an expert interviewer and technical recruiter. Your task is to analyze the following raw text (copied from a LinkedIn post), extract the company name, interview questions, and identify relevant topic tags.

Available Tag List:
${tagsListStr}

Output Format Rules:
Your output MUST follow this exact tag format:

[COMPANY]
Write the name of the company hiring or interviewing (e.g. Barclays, Google, Deloitte, etc.). If no company name is mentioned, write "Unknown Company".

[TAGS]
Write a comma-separated list of the most relevant tags matching the questions. 
1. First, select matching tags from the "Available Tag List" above.
2. Second, if there are important topics in the questions that are not in the list (e.g. SQL, Python, Docker, CI/CD, Git), you MUST suggest new tags for them. Keep suggested tags short (1-2 words).
3. Do not include generic tags like "Questions" or "Interview".

[QUESTIONS]
List the clean interview questions or coding exercises as a numbered list. Keep category headers or topic sections (e.g. "Java Questions", "Selenium Problems", "Automation", etc.) intact if the questions are grouped under different categories. List the questions underneath their respective headers.

Rules:
1. Remove all greetings, introductory chatter, promotional text, sign-offs, hashtags, and personal comments.
2. If no questions are found in the text, write "No interview questions found in this post." under [QUESTIONS].

Raw LinkedIn Post Text:
${content}`;

    const completionUrl = `${BASE_URL}/chat/completions`;

    const response = await fetch(completionUrl, {
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
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(60000), // 60s timeout
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('NVIDIA API Completion Error:', errText);
      return Response.json({ error: 'Failed to extract questions. Please check the API status or key.' }, { status: response.status });
    }

    const data = await response.json();
    const extractedText = (data.choices?.[0]?.message?.content || '').trim();

    // Parse the [COMPANY], [TAGS], and [QUESTIONS] tags
    let company = '';
    let questions = '';
    let tags = [];

    const companyMatch = extractedText.match(/\[COMPANY\]\n([\s\S]*?)(?=\n\n\[TAGS\]|\n\[TAGS\]|\n\n\[QUESTIONS\]|\n\[QUESTIONS\]|$)/i);
    const tagsMatch = extractedText.match(/\[TAGS\]\n([\s\S]*?)(?=\n\n\[QUESTIONS\]|\n\[QUESTIONS\]|$)/i);
    const questionsMatch = extractedText.match(/\[QUESTIONS\]\n([\s\S]*)/i);

    if (companyMatch) {
      company = companyMatch[1].trim();
      if (company.toLowerCase() === 'unknown company') {
        company = '';
      }
    }

    if (tagsMatch) {
      tags = tagsMatch[1]
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0 && t.toLowerCase() !== 'unknown' && t.toLowerCase() !== 'none');
    }
    
    if (questionsMatch) {
      questions = questionsMatch[1].trim();
    } else {
      questions = extractedText;
    }

    return Response.json({
      success: true,
      questions,
      company,
      tags
    });
  } catch (err) {
    console.error('Extraction handler error:', err);
    return Response.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
