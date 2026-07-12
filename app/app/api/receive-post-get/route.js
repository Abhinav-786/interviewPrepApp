import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const TEMP_DIR = path.join(process.cwd(), '.temp-imports');
const NVIDIA_API_KEY = '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';
const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const MODEL = 'meta/llama-3.1-8b-instruct';

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
    const parsedQuestions = [];

    // Automatically extract questions, company name, and tags using NVIDIA API
    try {
      const prompt = `You are an expert interviewer and technical recruiter. Your task is to analyze the following raw text (copied from a LinkedIn post), extract the company name, interview questions, and identify relevant topic tags.

Available Tag List:
${DEFAULT_TAGS.join(', ')}

Polishing & Restructuring Rules:
1. PROFESSIONAL PHRASING: Expand shorthand notes, fragments, or brief interview summaries into grammatically complete, professional interview questions.
   - "OOPs concept in java and usage in Selenium?" -> "Explain the main Object-Oriented Programming (OOP) concepts in Java and how you have implemented them in your Selenium framework."
   - "Groups in TestNG?" -> "What is the purpose of groups in TestNG, and how do you execute specific test groups?"
   - "Checked vs Unchecked exceptions." -> "What is the difference between checked and unchecked exceptions in Java? Provide examples of each."
   - "Second most repeating character." -> "Write a Java program to find the second most frequently occurring character in a given string."
   - "Git commands: stashing, cherry pick" -> "Explain the purpose of Git stashing and Git cherry-pick commands with their respective syntax."
2. TECHNICAL ACCURACY: Correct all technical spelling, casing, or abbreviations (e.g., "nvdia" to "NVIDIA", "Xpath" to "XPath", "testng" to "TestNG", "java" to "Java", "selenium" to "Selenium").
3. NO RESOLUTIONS: Do not answer the questions, just format the question prompts themselves.

Output Format Rules:
Your output MUST follow this exact tag format:

[COMPANY]
Write the name of the company hiring or interviewing (e.g. Barclays, Google, Deloitte, etc.). If no company name is mentioned, write "Unknown Company".

[TAGS]
Write a comma-separated list of the overall topic tags matching the post.

[QUESTIONS]
List each question on a new line prefixing with a bullet (- ) and suffixing with a pipe (|) and its specific topic tag. Choose the most relevant tag from the "Available Tag List" above, or suggest a new specific tag if it is a different topic (e.g. SQL, Git, Python).
Format: - [Question Text] | [Tag]

Raw LinkedIn Post Text:
${content}`;

      const openai = new OpenAI({
        apiKey: NVIDIA_API_KEY,
        baseURL: BASE_URL,
      });

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        top_p: 1,
        max_tokens: 4096,
        seed: 42,
      });

      const extractedText = (completion.choices?.[0]?.message?.content || '').trim();
      
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
        const qLines = qText.split('\n');
        for (let line of qLines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          const listItemMatch = trimmed.match(/^([-*•\d+[\.\)]\s*)(.+)$/);
          let contentLine = trimmed;
          if (listItemMatch) {
            contentLine = listItemMatch[2].trim();
          }
          
          const parts = contentLine.split('|');
          if (parts.length >= 2) {
            const qTextPart = parts.slice(0, -1).join('|').trim();
            const qTag = parts[parts.length - 1].trim();
            parsedQuestions.push({ text: qTextPart, tag: qTag });
          } else if (contentLine) {
            parsedQuestions.push({ text: contentLine, tag: detectedTags[0] || 'General' });
          }
        }
      }
    } catch (err) {
      console.error('Auto-extraction in API handler failed:', err);
    }

    if (parsedQuestions.length > 0) {
      finalContent = parsedQuestions.map((q, idx) => `${idx + 1}. ${q.text}`).join('\n');
    }

    const finalCompany = detectedCompany || author.trim();

    const importId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const data = {
      content: finalContent,
      questions: parsedQuestions,
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
