import OpenAI from 'openai';

/**
 * /api/extract-questions
 * 
 * Uses OpenAI-compatible NVIDIA completion API to extract company name,
 * interview questions, and relevant tags matching the questions.
 */

const DEFAULT_API_KEY = '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';
const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.1-8b-instruct';

const DEFAULT_TAGS = ['Java', 'Javascript', 'Selenium', 'Automation', 'Manual', 'Playwright', 'Nightwatch', 'API Testing', 'General'];

export async function POST(request) {
  try {
    const { content, apiKey, availableTags, questionsToPolish } = await request.json();

    if (questionsToPolish && Array.isArray(questionsToPolish)) {
      const key = apiKey?.trim() || process.env.NVIDIA_API_KEY || DEFAULT_API_KEY;
      if (!key) {
        return Response.json({ error: 'Missing API Key.' }, { status: 400 });
      }

      const openai = new OpenAI({
        apiKey: key,
        baseURL: BASE_URL,
      });

      const prompt = `You are an expert technical interviewer and senior SDET/QA recruiter.
Your task is to restructure and polish the following list of interview questions to ensure correct grammar and professional phrasing.

Rules:
1. Keep the exact same number of questions (exactly ${questionsToPolish.length} items).
2. Do not skip, merge, or omit any question.
3. Return the result in a raw JSON array of strings containing the polished questions in the exact same order.
4. Do not include markdown code block formatting (like \`\`\`json). Just return the raw JSON array string.

Input Questions to Polish:
${JSON.stringify(questionsToPolish, null, 2)}`;

      const completion = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        top_p: 1,
        max_tokens: 4096,
        seed: 42,
      });

      const responseText = (completion.choices?.[0]?.message?.content || '').trim();
      let cleanJson = responseText;
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      }

      try {
        const polishedList = JSON.parse(cleanJson);
        if (Array.isArray(polishedList)) {
          return Response.json({
            success: true,
            polishedQuestions: polishedList
          });
        }
      } catch (jsonErr) {
        console.error('Failed to parse polished list JSON:', cleanJson, jsonErr);
      }

      return Response.json({
        success: true,
        polishedQuestions: questionsToPolish
      });
    }

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
      apiKey: key,
      baseURL: BASE_URL,
    });

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
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
    let company = '';
    let rawQuestionsText = '';
    let tags = [];
    const parsedQuestions = [];

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
      rawQuestionsText = questionsMatch[1].trim();
    } else {
      rawQuestionsText = extractedText;
    }

    // Parse the structured questions block
    const qLines = rawQuestionsText.split('\n');
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
        const qText = parts.slice(0, -1).join('|').trim();
        const qTag = parts[parts.length - 1].trim();
        parsedQuestions.push({ text: qText, tag: qTag });
      } else if (contentLine) {
        parsedQuestions.push({ text: contentLine, tag: tags[0] || 'General' });
      }
    }

    // Format the content string for the textarea editor (simple numbered list)
    const formattedQuestionsContent = parsedQuestions.map((q, idx) => `${idx + 1}. ${q.text}`).join('\n');

    return Response.json({
      success: true,
      questions: formattedQuestionsContent,
      structuredQuestions: parsedQuestions,
      company,
      tags
    });
  } catch (err) {
    console.error('Extraction handler error:', err);
    return Response.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
