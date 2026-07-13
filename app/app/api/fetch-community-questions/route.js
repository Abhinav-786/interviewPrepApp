import OpenAI from 'openai';

/**
 * /api/fetch-community-questions
 *
 * Strategy:
 * 1. Stack Overflow API: fully open, returns real questions (verified working).
 * 2. Reddit: 403 blocked for server-side requests — replaced with AI-simulated
 *    "community context" that generates questions inspired by typical Reddit
 *    SDET discussions, labelled as "Community" source.
 * 3. AI uses all gathered material to produce experience-filtered questions.
 */

const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'z-ai/glm-5.2';

function getClient() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error('NVIDIA_API_KEY is not configured on the server.');
  return new OpenAI({ apiKey, baseURL: BASE_URL });
}

const EXPERIENCE_CONFIG = {
  junior: {
    label: 'Junior (0–2 years)',
    instruction: `Focus on fundamental SDET concepts:
- What/why/how questions about Selenium, TestNG, JUnit, Manual Testing basics
- Simple debugging scenarios and basic locator strategies
- Basic API testing concepts (REST, status codes, Postman basics)
- Entry-level test case design, bug reporting, and regression basics`,
    communityThemes: [
      'What is the difference between Selenium WebDriver and Selenium RC?',
      'How do you handle dynamic elements in Selenium?',
      'What is a test framework and why do we use TestNG/JUnit?',
      'How do you write your first automated test in Java with Selenium?',
      'What is the difference between findElement and findElements?',
      'How do you handle alerts and pop-ups in Selenium?',
      'What is XPath and how is it different from CSS selector?',
      'How do you report bugs in a QA role?',
      'What is the difference between smoke testing and sanity testing?',
      'How do you use Postman to test a REST API?',
    ],
  },
  mid: {
    label: 'Mid-level (2–5 years)',
    instruction: `Focus on intermediate SDET design & practice:
- Framework design (Page Object Model, Data-Driven, Keyword-Driven)
- CI/CD integration (Jenkins, GitHub Actions, Azure DevOps)
- Docker basics and test grid (Selenium Grid, BrowserStack)
- API automation (RestAssured, Axios, Postman collections)
- Cross-browser and parallel test execution challenges`,
    communityThemes: [
      'How do you design a Page Object Model framework from scratch?',
      'How would you integrate your Selenium tests with Jenkins CI/CD pipeline?',
      'What is the difference between TestNG and JUnit 5 for automation?',
      'How do you implement data-driven testing with Excel or JSON?',
      'What is Docker and how do you run Selenium tests in a containerized environment?',
      'How do you handle flaky tests in your automation suite?',
      'What is the best way to handle test data management in automation?',
      'How do you implement parallel execution with Selenium Grid?',
      'How do you test REST APIs using RestAssured in Java?',
      'What is your approach to maintaining a large automation test suite?',
    ],
  },
  senior: {
    label: 'Senior (5+ years)',
    instruction: `Focus on senior SDET leadership & architecture:
- Designing test infrastructure and automation strategy from scratch
- Scalability, maintainability, and test debt discussions
- Team leadership, mentoring, and hiring decisions
- Performance testing architecture (JMeter, k6, Gatling)
- System design for test platforms and flaky test root-cause analysis`,
    communityThemes: [
      'How would you design a test automation strategy for a greenfield microservices project?',
      'How do you manage test pyramid balance between unit, integration and E2E tests?',
      'What metrics do you use to measure the effectiveness of your test automation?',
      'How would you handle a team where developers push back on writing tests?',
      'Describe how you architected a scalable test infrastructure at your previous company.',
      'How do you identify and eliminate flaky tests systematically?',
      'What is your approach to performance testing in a CI/CD environment?',
      'How would you introduce shift-left testing in an organization resistant to change?',
      'How do you decide which tests should be automated vs kept manual?',
      'What is your strategy for test data management at scale?',
    ],
  },
};

// ─── Stack Overflow Fetcher ───────────────────────────────────────────────────

async function fetchStackOverflow(tags) {
  const posts = [];

  // Fetch from multiple tag combinations to get diverse questions
  const tagCombinations = [
    tags.join(';'),
    'selenium;java',
    'playwright;testing',
  ];

  for (const tagStr of tagCombinations) {
    try {
      const url = `https://api.stackexchange.com/2.3/questions?tagged=${encodeURIComponent(tagStr)}&site=stackoverflow&sort=votes&order=desc&pagesize=10&filter=withbody`;

      const res = await fetch(url);

      if (!res.ok) {
        console.warn(`Stack Overflow API returned ${res.status} for tags: ${tagStr}`);
        continue;
      }

      const buffer = await res.arrayBuffer();
      let text;
      try {
        // Stack Overflow API returns gzip-compressed data
        const { gunzipSync } = await import('zlib');
        text = gunzipSync(Buffer.from(buffer)).toString('utf-8');
      } catch {
        text = Buffer.from(buffer).toString('utf-8');
      }

      const data = JSON.parse(text);
      const items = data?.items || [];

      for (const item of items) {
        if (item.answer_count >= 1 && item.score >= 0) {
          const cleanBody = (item.body || '')
            .replace(/<code[^>]*>[\s\S]*?<\/code>/gi, '[code example]')
            .replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, '[code block]')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 500);

          posts.push({
            source: 'stackoverflow',
            platform: 'Stack Overflow',
            title: item.title,
            body: cleanBody,
            url: item.link,
            score: item.score,
            tags: item.tags || [],
          });
        }
      }
    } catch (err) {
      console.error(`Stack Overflow fetch error for ${tagStr}:`, err.message);
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  return posts.filter(p => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { experience = 'mid', sources = ['reddit', 'stackoverflow'] } = await request.json();

    const expConfig = EXPERIENCE_CONFIG[experience] || EXPERIENCE_CONFIG.mid;
    let allPosts = [];
    let redditSimulated = false;

    // Stack Overflow — fully supported
    if (sources.includes('stackoverflow')) {
      const soPosts = await fetchStackOverflow(['selenium', 'automation-testing', 'software-testing']);
      allPosts = [...allPosts, ...soPosts];
      console.log(`Stack Overflow: fetched ${soPosts.length} posts`);
    }

    // Reddit — 403 blocked for server-side requests; inject curated community context
    if (sources.includes('reddit')) {
      redditSimulated = true;
      const communityPosts = expConfig.communityThemes.map((theme, i) => ({
        source: 'reddit',
        platform: 'Community (Reddit-inspired)',
        title: theme,
        body: `Community discussion thread about: ${theme}`,
        url: `https://www.reddit.com/r/QualityAssurance/search/?q=${encodeURIComponent(theme.split(' ').slice(0, 4).join('+'))}`,
        score: 10 - i,
      }));
      allPosts = [...allPosts, ...communityPosts];
      console.log(`Community context: injected ${communityPosts.length} themed entries`);
    }

    if (allPosts.length === 0) {
      return Response.json(
        { error: 'Unable to load questions. Please ensure Stack Overflow is selected and try again.' },
        { status: 404 }
      );
    }

    console.log(`Total posts for AI processing: ${allPosts.length}`);

    const postsText = allPosts.slice(0, 28).map((p, i) =>
      `[Item ${i + 1}] Source: ${p.platform}\nTitle: ${p.title}\nBody: ${p.body || ''}\nURL: ${p.url}`
    ).join('\n\n---\n\n');

    let openai;
    try {
      openai = getClient();
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }

    const prompt = `You are an expert SDET recruiter and technical interview coach with 10+ years of experience.

Your task: Generate 10–12 high-quality SDET interview questions for a **${expConfig.label}** candidate.

Level requirements:
${expConfig.instruction}

Use the following community posts and Stack Overflow questions as inspiration and context:

${postsText}

Rules:
1. Generate 10–12 DISTINCT, clearly phrased technical interview questions.
2. Every question must be appropriate for the ${expConfig.label} experience level.
3. Questions must be specific and technical, not generic like "Tell me about yourself".
4. For each question write a brief answer hint (2–3 sentences) that tells the candidate what key points to cover.
5. Assign 1–3 relevant tags from ONLY: Java, JavaScript, Python, Selenium, Playwright, Cypress, API Testing, CI/CD, Manual Testing, Automation, Performance Testing, Docker, TestNG, JUnit, Postman, SQL, Design Patterns, System Design.
6. For source/sourceUrl: if inspired by a Stack Overflow item use "stackoverflow" and its URL; if from community themes use "community" and a Reddit search URL.
7. Mix topics across different areas (not all Selenium, not all API).

Respond ONLY with a valid JSON array, no markdown code fences, no text before or after:
[
  {
    "question": "Specific interview question ending with ?",
    "hint": "Key points the candidate should cover in their answer.",
    "tags": ["Tag1", "Tag2"],
    "source": "stackoverflow",
    "sourceUrl": "https://..."
  }
]`;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 4000,
    });

    const rawAI = (completion.choices?.[0]?.message?.content || '').trim();
    console.log('AI response length:', rawAI.length);

    let questions = [];
    try {
      // Try to extract JSON array robustly
      const jsonMatch = rawAI.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        // Try the whole response as JSON
        questions = JSON.parse(rawAI);
      }
    } catch (parseErr) {
      console.error('AI parse error:', parseErr.message);
      console.error('Raw AI output (first 500 chars):', rawAI.slice(0, 500));
      return Response.json(
        { error: 'AI failed to produce a valid question list. Please try again.' },
        { status: 500 }
      );
    }

    const validatedQuestions = questions
      .filter(q => q && q.question && typeof q.question === 'string' && q.question.length > 10)
      .map((q, i) => ({
        id: `fetched_${Date.now()}_${i}`,
        question: q.question.trim(),
        hint: (q.hint || '').trim(),
        tags: Array.isArray(q.tags) ? q.tags.slice(0, 3) : [],
        source: q.source || 'community',
        sourceUrl: q.sourceUrl || '',
      }));

    if (validatedQuestions.length === 0) {
      return Response.json(
        { error: 'AI returned no valid questions. Please try again.' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      questions: validatedQuestions,
      meta: {
        experience: expConfig.label,
        totalFetched: allPosts.length,
        extracted: validatedQuestions.length,
        redditNote: redditSimulated ? 'Reddit uses curated community patterns (live API restricted)' : null,
        sources: {
          stackoverflow: allPosts.filter(p => p.source === 'stackoverflow').length,
          community: allPosts.filter(p => p.source === 'reddit').length,
        },
      },
    });

  } catch (err) {
    console.error('Community questions fetch failed:', err);
    return Response.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
