import OpenAI from 'openai';

const DEFAULT_API_KEY = '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';
const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.1-8b-instruct';

export async function POST(request) {
  try {
    const { question, answer, apiKey } = await request.json();

    if (!question || !question.trim()) {
      return Response.json({ error: 'No question text provided' }, { status: 400 });
    }

    const key = apiKey?.trim() || process.env.NVIDIA_API_KEY || DEFAULT_API_KEY;
    if (!key) {
      return Response.json({ error: 'Missing API Key.' }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: key,
      baseURL: BASE_URL,
    });

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
