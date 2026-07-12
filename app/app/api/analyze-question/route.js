import OpenAI from 'openai';

/**
 * /api/analyze-question
 * 
 * Uses NVIDIA NIM API (via OpenAI-compatible SDK) to verify or generate
 * technical interview answers for the Progress Tracker.
 * API key is managed server-side via NVIDIA_API_KEY env variable.
 */

const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'z-ai/glm-5.2';

function getClient() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error('NVIDIA_API_KEY is not configured on the server.');
  return new OpenAI({ apiKey, baseURL: BASE_URL });
}

export async function POST(request) {
  try {
    const { question, answer } = await request.json();

    if (!question || !question.trim()) {
      return Response.json({ error: 'No question text provided' }, { status: 400 });
    }

    let openai;
    try {
      openai = getClient();
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }

    let prompt = '';
    const cleanAnswer = (answer || '').trim();

    if (!cleanAnswer) {
      prompt = `You are an expert technical interviewer and senior SDET/QA recruiter.
Provide a concise, expert-level technical answer to the following interview question.

Question:
${question}

Rules:
1. Provide a professional, structured, and clear response.
2. Include short code blocks, syntax examples, or command examples if they enrich the explanation.
3. Keep it brief enough to be spoken naturally in an interview (1-3 paragraphs max).`;
    } else {
      prompt = `You are an expert technical interviewer and senior SDET/QA recruiter.
Evaluate the correctness of the user's draft answer for the following technical interview question.

Question:
${question}

User's Draft Answer:
${cleanAnswer}

Provide your feedback in this exact structured markdown format:

### 📊 Correctness Score: X / 10
(Assign a realistic score based on accuracy, completeness, and keyword coverage)

### 🎯 Key Feedback & What's Missing
- Point 1 (what they got right or wrong)
- Point 2 (important terminology, edge cases, or details they missed)

### 💡 Recommended Technical Answer
(Provide a concise, model response they can use to ace their interview, including short code/syntax examples if relevant)`;
    }

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      top_p: 1,
      max_tokens: 2048,
      seed: 42,
    });

    const analysis = (completion.choices?.[0]?.message?.content || '').trim();

    return Response.json({
      success: true,
      analysis,
    });
  } catch (err) {
    console.error('Question analysis failed:', err);
    return Response.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
