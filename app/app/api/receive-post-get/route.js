import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), '.temp-imports');
const NVIDIA_API_KEY = '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';
const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const MODEL = 'z-ai/glm-5.2';

const DEFAULT_TAGS = ['Java', 'Javascript', 'Selenium', 'Automation', 'Manual', 'Playwright', 'Nightwatch', 'API Testing', 'General'];

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const content = searchParams.get('content') || '';
    const author = searchParams.get('author') || '';
    const url = searchParams.get('url') || '';

    if (!content) {
      return new Response('Error: No content received.', { status: 400 });
    }

    let finalContent = content.trim();
    let detectedCompany = '';
    let detectedTags = [];

    // Automatically extract questions, company name, and tags using NVIDIA API
    try {
      const prompt = `You are an expert interviewer and technical recruiter. Your task is to analyze the following raw text (copied from a LinkedIn post), extract the company name, interview questions, and identify relevant topic tags.

Available Tag List:
${DEFAULT_TAGS.join(', ')}

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

      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          top_p: 1,
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(12000), // 12s timeout
      });

      if (response.ok) {
        const data = await response.json();
        const extractedText = (data.choices?.[0]?.message?.content || '').trim();
        
        // Parse the [COMPANY], [TAGS], and [QUESTIONS] tags
        const companyMatch = extractedText.match(/\[COMPANY\]\n([\s\S]*?)(?=\n\n\[TAGS\]|\n\[TAGS\]|\n\n\[QUESTIONS\]|\n\[QUESTIONS\]|$)/i);
        const tagsMatch = extractedText.match(/\[TAGS\]\n([\s\S]*?)(?=\n\n\[QUESTIONS\]|\n\[QUESTIONS\]|$)/i);
        const questionsMatch = extractedText.match(/\[QUESTIONS\]\n([\s\S]*)/i);

        if (companyMatch) {
          const comp = companyMatch[1].trim();
          if (comp.toLowerCase() !== 'unknown company') {
            detectedCompany = comp;
          }
        }

        if (tagsMatch) {
          detectedTags = tagsMatch[1]
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0 && t.toLowerCase() !== 'unknown' && t.toLowerCase() !== 'none');
        }
        
        if (questionsMatch) {
          const qText = questionsMatch[1].trim();
          if (qText && !qText.includes("No interview questions found")) {
            finalContent = qText;
          }
        }
      }
    } catch (err) {
      console.error('Auto-extraction in API handler failed:', err);
    }

    const finalCompany = detectedCompany || author.trim();

    const importId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const data = {
      content: finalContent,
      author: finalCompany,
      url: url.trim(),
      tags: detectedTags, // Pass detected tags through
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
    console.error('Error in receive-post-get:', err);
    return new Response(`Error processing request: ${err.message}`, { status: 500 });
  }
}
