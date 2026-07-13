import OpenAI from 'openai';

/**
 * /api/evaluate-interview
 * 
 * Uses NVIDIA NIM API with z-ai/glm-5.2 model to evaluate multiple questions 
 * and user answers from a completed Mock Interview session.
 * Returns an overall grade, feedback points, and ideal answers.
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
    const { answers } = await request.json();

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return Response.json({ error: 'No interview answers provided for evaluation.' }, { status: 400 });
    }

    let openai;
    try {
      openai = getClient();
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }

    // Format Q&A array for prompt
    const formattedSessions = answers.map((a, i) => {
      return `[Question ${i + 1}]
Q: ${a.question}
User Answer: ${a.answer || '(No answer provided)'}
`;
    }).join('\n\n');

    const prompt = `You are a Principal Software Engineer in Test (SDET) and senior QA recruiter.
Evaluate the candidate's responses in this mock interview session. For each question, provide a score, feedback (strengths/missing points), and a short model answer. Finally, calculate an overall score out of 10 and write a high-level summary.

Your output MUST be a JSON object conforming exactly to the following schema structure. Do not include markdown code block formatting (like \`\`\`json). Just return the raw JSON object string.

Schema:
{
  "overallScore": 7.5,
  "verdict": "Pass" or "Borderline" or "Fail",
  "summary": "High-level SDET feedback summary on their performance, coding style, framework knowledge, and verbal structure.",
  "evaluations": [
    {
      "question": "The question text",
      "userAnswer": "The candidate's answer",
      "score": 8,
      "feedback": "Short feedback on what was correct, incorrect, or missing (e.g. key terminology like Explicit Wait vs Fluent Wait).",
      "idealAnswer": "Concise, principal-level model answer for this question."
    }
  ]
}

Candidate Mock Session Q&A:
${formattedSessions}`;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      top_p: 1,
      max_tokens: 4096,
      response_format: { type: 'json_object' }
    });

    const responseText = (completion.choices?.[0]?.message?.content || '').trim();
    let cleanJson = responseText;
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    }

    try {
      const evaluationData = JSON.parse(cleanJson);
      return Response.json({
        success: true,
        report: evaluationData
      });
    } catch (jsonErr) {
      console.error('Failed to parse evaluation result JSON:', cleanJson, jsonErr);
      return Response.json({
        error: 'AI did not return valid JSON feedback.',
        rawText: responseText
      }, { status: 500 });
    }
  } catch (err) {
    console.error('Mock interview evaluation failed:', err);
    return Response.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
