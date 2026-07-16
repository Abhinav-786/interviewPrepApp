'use client';

export const DEFAULT_TAGS = ['Java', 'Javascript', 'Selenium', 'Automation', 'Manual', 'Playwright', 'Nightwatch', 'API Testing', 'General'];
export const STATUSES = ['To Read', 'In Progress', 'Done'];
export const STATUS_CYCLE = { 'To Read': 'In Progress', 'In Progress': 'Done', 'Done': 'To Read' };
export const STATUS_CLASS = { 'To Read': 'status-todo', 'In Progress': 'status-progress', 'Done': 'status-done' };
export const STATUS_EMOJI = { 'To Read': '📖', 'In Progress': '⏳', 'Done': '✅' };
export const LS_KEY = 'interviewprep_posts';
export const LS_TAGS_KEY = 'interviewprep_tags';

export function genId() {
  return `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function initials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDeterministicDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[parseInt(month, 10) - 1];
  return `${parseInt(day, 10)} ${monthName} ${year}`;
}

export function formatDeterministicMonthYear(dateStr) {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[parseInt(month, 10) - 1];
  const shortYear = year.slice(-2);
  return `${monthName} '${shortYear}`;
}

export function formatDeterministicLongDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = months[parseInt(month, 10) - 1];
  return `${monthName} ${parseInt(day, 10)}, ${year}`;
}

export function truncate(str, n = 140) {
  return str && str.length > n ? str.slice(0, n).trimEnd() + '…' : str;
}

// Generates cohesive, professional colors dynamically for any tag name
export function getTagStyle(tag) {
  if (!tag) return {};
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const s = 65;
  const l = 65;
  return {
    background: `hsla(${h}, ${s}%, ${l}%, 0.15)`,
    color: `hsla(${h}, ${s + 15}%, ${l + 10}%, 1)`,
    border: `1px solid hsla(${h}, ${s}%, ${l}%, 0.3)`
  };
}

export function getPostTags(post) {
  if (!post) return [];
  if (Array.isArray(post.tags)) return post.tags;
  if (post.tag) return [post.tag];
  return [];
}

export function getPostQuestions(post) {
  if (!post) return [];
  if (Array.isArray(post.questions)) return post.questions;
  // Fallback: parse lines from content
  const lines = (post.content || '').split('\n');
  const parsed = [];
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const cleaned = trimmed.replace(/^[-*•\d+[\.\)]\s*/, '').trim();
    if (cleaned) {
      parsed.push({
        text: cleaned,
        tag: getPostTags(post)[0] || 'General'
      });
    }
  }
  return parsed;
}

// ─── CSV Export ─────────────────────────────────────────────────────────────
export function toCSV(posts) {
  const headers = ['#', 'Post URL', 'Company Name', 'Date Added', 'Topic Tags', 'Status', 'Content'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = posts.map((p, i) =>
    [i + 1, p.url || '', p.author || '', formatDate(p.addedAt), getPostTags(p).join(' | '), p.status, p.content || ''].map(escape).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function downloadCSV(posts) {
  const blob = new Blob([toCSV(posts)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-prep-posts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Helper to parse questions from markdown guide
export function parseQuestionsFromMarkdown(markdownText) {
  if (!markdownText) return [];
  const lines = markdownText.split('\n');
  const questions = [];
  let currentCategory = 'General';

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Detect headings (e.g. ### Java Core Concepts)
    if (line.startsWith('#')) {
      currentCategory = line.replace(/^#+\s*/, '').trim();
      continue;
    }

    // Strip bold formatting globally for matching (e.g. **1.** What is Java? -> 1. What is Java?)
    const lineWithoutBold = line.replace(/\*\*/g, '').trim();

    // Check for standard list item indicators: e.g. "1. ", "1) ", "- ", "* "
    const listItemMatch = lineWithoutBold.match(/^(\d+[\.\)]\s*|[-*•]\s*|\[\s*\]\s*|\[x\]\s*)(.+)$/i);

    // Check for "Question 1:" or "Q1:" prefixes
    const questionPrefixMatch = lineWithoutBold.match(/^(Question\s*\d+:\s*|Q\d+:\s*)(.+)$/i);

    let isQuestion = false;
    let questionText = '';

    if (listItemMatch) {
      isQuestion = true;
      questionText = listItemMatch[2].trim();
    } else if (questionPrefixMatch) {
      isQuestion = true;
      questionText = questionPrefixMatch[2].trim();
    } else if (lineWithoutBold.endsWith('?') || lineWithoutBold.toLowerCase().startsWith('how ') || lineWithoutBold.toLowerCase().startsWith('what ') || lineWithoutBold.toLowerCase().startsWith('explain ')) {
      // Direct question fallback
      isQuestion = true;
      questionText = lineWithoutBold;
    }

    // Clean up residual styling character wraps
    if (questionText) {
      // Remove leading/trailing quotes, underscores, asterisks
      questionText = questionText.replace(/^[\*_\s"'`]+/, '').replace(/[\*_\s"'`]+$/, '').trim();
    }

    if (isQuestion && questionText && !questionText.startsWith('#') && !questionText.startsWith('---') && questionText.length > 5) {
      questions.push({
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        category: currentCategory,
        text: questionText,
        status: 'To Do'
      });
    }
  }
  return questions;
}

// ─── Bookmarklet code (runs on linkedin.com in user's browser) ────────────────
export function getBookmarkletCode(baseUrl) {
  // Minified inline script that grabs text from the LinkedIn page DOM and redirects via window.open
  const script = `
(function(){
  function getText(sels){for(var s of sels){var e=document.querySelector(s);if(e&&e.innerText&&e.innerText.trim()){return e.innerText.trim();}}return '';}
  var content=getText([
    '.update-components-text .update-components-text-view',
    '.feed-shared-update-v2__commentary',
    '.update-components-text',
    '.feed-shared-inline-show-more-text',
    '.feed-shared-text',
    '[data-test-id="main-feed-activity-card__commentary"]',
    '.break-words'
  ]);
  var author=getText([
    '.update-components-actor__title span[aria-hidden]',
    '.update-components-actor__name',
    '.feed-shared-actor__title',
    '.feed-shared-actor__name'
  ]);
  var url=window.location.href;
  if(!content){alert('Could not find post text. Make sure you are on a LinkedIn post page.');return;}
  
  var target = '${baseUrl}/api/receive-post-get?content=' + encodeURIComponent(content) + '&author=' + encodeURIComponent(author) + '&url=' + encodeURIComponent(url);
  window.open(target, '_blank');
})();`.trim().replace(/\n\s*/g, ' ');
  return `javascript:${encodeURIComponent(script)}`;
}
