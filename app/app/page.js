'use client';

import { useState, useEffect, useCallback } from 'react';

// Shared Utilities & Constants
import {
  DEFAULT_TAGS,
  genId,
  downloadCSV,
  parseQuestionsFromMarkdown,
  getPostQuestions
} from '../components/utils';

// Shared Modals & Toast
import Toast from '../components/Toast';
import FocusClockTab from '../components/FocusClockTab';
import SaveBoardModal from '../components/SaveBoardModal';
import TrackerTaskModal from '../components/TrackerTaskModal';
import ViewPostModal from '../components/ViewPostModal';
import AddPostModal from '../components/AddPostModal';
import CommunityQuestionsFetcher from '../components/CommunityQuestionsFetcher';

// Feature Tab Components
import DashboardTab from '../components/DashboardTab';
import ResourcesTab from '../components/ResourcesTab';
import PrepTab from '../components/PrepTab';
import TrackerTab from '../components/TrackerTab';
import FlashcardsTab from '../components/FlashcardsTab';
import MockInterviewTab from '../components/MockInterviewTab';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [showModal, setShowModal] = useState(false);
  const [initialImportData, setInitialImportData] = useState(null);
  const [viewingPost, setViewingPost] = useState(null);
  const [postToEdit, setPostToEdit] = useState(null);

  // Prep Generator Tab State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [prepSelectedTags, setPrepSelectedTags] = useState([]);
  const [prepKeywords, setPrepKeywords] = useState('');
  const [prepGuide, setPrepGuide] = useState(null);
  const [copiedPrep, setCopiedPrep] = useState(false);
  const [generatingPrep, setGeneratingPrep] = useState(false);

  // Community Questions Fetcher State
  const [fetcherOpen, setFetcherOpen] = useState(false);
  const [fetcherExp, setFetcherExp] = useState('mid');
  const [fetcherSources, setFetcherSources] = useState(['reddit', 'stackoverflow']);
  const [fetcherLoading, setFetcherLoading] = useState(false);
  const [fetchedQuestions, setFetchedQuestions] = useState([]);
  const [selectedFetched, setSelectedFetched] = useState(new Set());
  const [fetcherTargetBoard, setFetcherTargetBoard] = useState('');
  const [fetcherStep, setFetcherStep] = useState('config');
  const [fetcherMeta, setFetcherMeta] = useState(null);

  // Progress Tracker Tab State
  const [trackerBoards, setTrackerBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState('default');
  const [showSaveBoardModal, setShowSaveBoardModal] = useState(false);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionCategory, setNewQuestionCategory] = useState('General');
  const [showAddQuestionInline, setShowAddQuestionInline] = useState(false);
  const [activeTrackerTask, setActiveTrackerTask] = useState(null);

  // Global Helpers / Settings
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
  }, []);

  const [nvidiaKey, setNvidiaKey] = useState('');
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [boardsLoaded, setBoardsLoaded] = useState(false);

  // Flashcards State
  const [flashcardBoardId, setFlashcardBoardId] = useState('default');
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  // Mock Interview State
  const [mockBoardId, setMockBoardId] = useState('default');
  const [mockQCount, setMockQCount] = useState(5);
  const [mockQuestions, setMockQuestions] = useState([]);
  const [mockAnswers, setMockAnswers] = useState([]);
  const [mockIndex, setMockIndex] = useState(0);
  const [mockActive, setMockActive] = useState(false);
  const [mockCompleted, setMockCompleted] = useState(false);
  const [mockReport, setMockReport] = useState(null);
  const [mockEvaluating, setMockEvaluating] = useState(false);
  const [mockRecording, setMockRecording] = useState(false);
  const [mockCurrentAnswer, setMockCurrentAnswer] = useState('');

  // Target Date & Daily Goals State
  const [targetDate, setTargetDate] = useState('');
  const [dailyGoal, setDailyGoal] = useState(5);
  const [studyDates, setStudyDates] = useState({});
  const [activityLoaded, setActivityLoaded] = useState(false);

  // Focus Alert Monitor States
  const [focusMonitorActive, setFocusMonitorActive] = useState(false);
  const [lastInteractionTime, setLastInteractionTime] = useState(0);

  // Lifted Focus Timer / Pomodoro Clock States
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [timerMode, setTimerMode] = useState('work'); // 'work' | 'break'
  const [timerTotalDuration, setTimerTotalDuration] = useState(25 * 60);

  // Update study boards questions
  const updateActiveBoardQuestions = useCallback((updater) => {
    setTrackerBoards(prev => prev.map(board => {
      if (board.id === activeBoardId || (!activeBoardId && board.id === 'default')) {
        const prevQuestions = board.questions || [];
        const nextQuestions = typeof updater === 'function' ? updater(prevQuestions) : updater;

        const prevDone = prevQuestions.filter(q => q.status === 'Done').length;
        const nextDone = nextQuestions.filter(q => q.status === 'Done').length;
        if (nextDone > prevDone) {
          logStudyActivity();
        }

        return { ...board, questions: nextQuestions };
      }
      return board;
    }));
  }, [activeBoardId]);

  // Logging daily study activity for heatmap
  const logStudyActivity = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setStudyDates(prev => {
      const next = { ...prev, [today]: (prev[today] || 0) + 1 };
      fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyDates: next })
      }).catch(err => console.error('Error saving study date activity:', err));
      return next;
    });
  }, []);

  // Community Questions Fetcher Handlers
  const handleFetchQuestions = useCallback(async () => {
    if (fetcherSources.length === 0) {
      showToast('Please select at least one source.', 'error');
      return;
    }
    setFetcherLoading(true);
    setFetchedQuestions([]);
    setSelectedFetched(new Set());
    setFetcherMeta(null);

    try {
      const res = await fetch('/api/fetch-community-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experience: fetcherExp, sources: fetcherSources }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to fetch questions.', 'error');
        return;
      }

      setFetchedQuestions(data.questions || []);
      setFetcherMeta(data.meta || null);
      setSelectedFetched(new Set(data.questions.map(q => q.id)));
      setFetcherStep('results');
    } catch (err) {
      showToast('Network error while fetching questions.', 'error');
    } finally {
      setFetcherLoading(false);
    }
  }, [fetcherExp, fetcherSources, showToast]);

  const handleImportFetched = useCallback(() => {
    const targetId = fetcherTargetBoard || activeBoardId;
    const toImport = fetchedQuestions.filter(q => selectedFetched.has(q.id));

    if (toImport.length === 0) {
      showToast('No questions selected to import.', 'error');
      return;
    }

    const newQuestions = toImport.map(q => ({
      id: genId(),
      text: q.question,
      status: 'To Do',
      category: q.tags?.[0] || 'General',
      notes: [
        q.hint ? `💡 Hint: ${q.hint}` : '',
        q.sourceUrl ? `🔗 Source: ${q.sourceUrl}` : '',
        q.source === 'reddit' ? '🟠 Sourced from Community / Reddit' : '🔵 Sourced from Stack Overflow',
      ].filter(Boolean).join('\n'),
      aiAnalysis: '',
      tags: q.tags || [],
      createdAt: new Date().toISOString(),
    }));

    setTrackerBoards(prev => prev.map(board => {
      if (board.id === targetId) {
        return { ...board, questions: [...(board.questions || []), ...newQuestions] };
      }
      return board;
    }));

    showToast(`✅ Imported ${toImport.length} questions into your study board!`, 'success');
    setFetcherOpen(false);
    setFetcherStep('config');
    setFetchedQuestions([]);
    setSelectedFetched(new Set());
    setActiveBoardId(targetId);
    setActiveTab('tracker');
    logStudyActivity();
  }, [fetchedQuestions, selectedFetched, fetcherTargetBoard, activeBoardId, showToast, logStudyActivity]);

  // Theme Toggler
  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('interviewprep_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  }

  // Load from project files & check URL import
  useEffect(() => {
    const savedTheme = localStorage.getItem('interviewprep_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        let loadedPosts = [];
        let loadedTags = [];
        let loadedKey = '';

        if (data.success) {
          loadedPosts = data.posts || [];
          loadedTags = data.tags || [];
          if (data.config && data.config.nvidiaKey) {
            loadedKey = data.config.nvidiaKey;
          }
        }

        // Migrate local storage
        if (loadedPosts.length === 0 && typeof window !== 'undefined') {
          try {
            const savedPostsStr = localStorage.getItem('interviewprep_posts');
            const savedTagsStr = localStorage.getItem('interviewprep_tags');
            const savedKeyStr = localStorage.getItem('interviewprep_nvidia_key') || '';

            const savedPosts = savedPostsStr ? JSON.parse(savedPostsStr) : [];
            const savedTags = savedTagsStr ? JSON.parse(savedTagsStr) : [];

            if (savedPosts.length > 0) {
              console.log('Migrating localStorage data to project files...');
              loadedPosts = savedPosts;
              if (savedTags.length > 0) loadedTags = savedTags;
              if (savedKeyStr) loadedKey = savedKeyStr;

              fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  posts: loadedPosts,
                  tags: loadedTags,
                  config: { nvidiaKey: loadedKey }
                })
              }).catch(err => console.error('Migration save error:', err));
            }
          } catch (e) {
            console.error('LocalStorage migration failed:', e);
          }
        }

        setPosts(loadedPosts);
        if (loadedTags.length > 0) setTags(loadedTags);
        if (loadedKey) setNvidiaKey(loadedKey);

        setMounted(true);
      })
      .catch(err => {
        console.error('Failed to load project files:', err);
        setMounted(true);
      });

    // Pending bookmarklet import check
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const importId = params.get('import_id');
      if (importId) {
        fetch(`/api/pending-post?id=${importId}`)
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('Failed to fetch pending post');
          })
          .then(data => {
            if (data && data.content) {
              setInitialImportData(data);
              setShowModal(true);

              if (Array.isArray(data.tags)) {
                setTags(prev => {
                  const merged = [...prev];
                  data.tags.forEach(t => {
                    if (t && !merged.includes(t)) merged.push(t);
                  });
                  return merged;
                });
              }

              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch(err => console.error(err));
      }
    }
  }, []);

  // Persist posts
  useEffect(() => {
    if (!mounted) return;
    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts })
    }).catch(err => console.error('Save posts error:', err));
  }, [posts, mounted]);

  // Persist tags
  useEffect(() => {
    if (!mounted) return;
    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags })
    }).catch(err => console.error('Save tags error:', err));
  }, [tags, mounted]);

  // Load tracker boards
  useEffect(() => {
    if (!mounted) return;

    fetch('/api/boards')
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.error || 'Failed to load boards');

        let boards = data.boards || [];
        const isEmptyDefault = boards.length === 1 && boards[0].id === 'default' && boards[0].questions.length === 0;

        if (isEmptyDefault && typeof window !== 'undefined') {
          try {
            const lsBoards = localStorage.getItem('interviewprep_boards');
            if (lsBoards) {
              const parsed = JSON.parse(lsBoards);
              if (Array.isArray(parsed) && parsed.length > 0) {
                boards = parsed;
                fetch('/api/boards', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ boards })
                }).catch(err => console.error('Board migration save error:', err));
                localStorage.removeItem('interviewprep_boards');
              }
            }
          } catch (e) {
            console.error('Board localStorage migration failed:', e);
          }
        }

        setTrackerBoards(boards);
        if (boards.length > 0) {
          const hasActive = boards.some(b => b.id === activeBoardId);
          if (!hasActive) setActiveBoardId(boards[0].id);
        }

        setBoardsLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load tracker boards:', err);
        setBoardsLoaded(true);
      });
  }, [mounted]);

  // Save tracker boards
  useEffect(() => {
    if (!mounted || !boardsLoaded) return;
    fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boards: trackerBoards })
    }).catch(err => console.error('Save boards error:', err));
  }, [trackerBoards, mounted, boardsLoaded]);

  // Load activity
  useEffect(() => {
    if (!mounted) return;
    fetch('/api/activity')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.activity) {
          setTargetDate(data.activity.targetDate || '');
          setDailyGoal(data.activity.dailyGoal || 5);
          setStudyDates(data.activity.studyDates || {});
        }
        setActivityLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load study activity:', err);
        setActivityLoaded(true);
      });
  }, [mounted]);

  // Save activity
  useEffect(() => {
    if (!mounted || !activityLoaded) return;
    fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDate, dailyGoal })
    }).catch(err => console.error('Save targetDate/goal error:', err));
  }, [targetDate, dailyGoal, mounted, activityLoaded]);

  // Focus Alert Monitor Idle Tick
  useEffect(() => {
    setLastInteractionTime(Date.now());
  }, [trackerBoards]);

  useEffect(() => {
    let interval = null;
    if (focusMonitorActive) {
      interval = setInterval(() => {
        const idleTime = Date.now() - lastInteractionTime;
        if (idleTime >= 600000) { // 10 minutes
          try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc1 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(330, audioCtx.currentTime);
            gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            osc1.start();
            osc1.stop(audioCtx.currentTime + 0.25);

            setTimeout(() => {
              try {
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(440, audioCtx.currentTime);
                gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.start();
                osc2.stop(audioCtx.currentTime + 0.25);
              } catch (innerErr) {}
            }, 180);
          } catch (e) {
            console.error('Focus monitor alert beep failed:', e);
          }
          showToast('Focus alert: No study progress detected in the last 10 minutes!', 'warning');
        }
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [focusMonitorActive, lastInteractionTime, showToast]);

  // Pomodoro Focus Timer ticking effect with 10-minute task-update reminders
  useEffect(() => {
    let interval = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          const next = prev - 1;
          const elapsed = timerTotalDuration - next;

          // Trigger task update reminders every 10 minutes (600 seconds)
          if (timerMode === 'work' && elapsed > 0 && elapsed % 600 === 0 && next > 0) {
            // 1. In-app toast reminder
            showToast('⏱️ Reminder: Don\'t forget to update your tasks in the Progress Tracker!', 'info');

            // 2. Sound chime alert (synthesized Web Audio API C5 note)
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 note
              gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
              osc.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.4);
            } catch (e) {
              console.error('Audio synthesizer reminder chime failed:', e);
            }

            // 3. Browser system Notification (HTML5 Notification API)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('⏱️ Study Reminder', {
                  body: '10 minutes have passed! Remember to update your study cards or task statuses.',
                  tag: 'sdet-copilot-study-reminder'
                });
              } catch (e) {
                console.error('System notification failed:', e);
              }
            }
          }

          return next;
        });
      }, 1000);
    } else if (timerActive && timerSeconds === 0) {
      // Alarm Beep using Web Audio API
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.6);
      } catch (e) {
        console.error('Audio synthesis alarm failed:', e);
      }

      showToast(
        timerMode === 'work'
          ? '🏆 Work block completed! Take a break.'
          : '💪 Break finished! Time to focus.',
        'success'
      );

      // Auto switch Pomodoro modes
      const nextMode = timerMode === 'work' ? 'break' : 'work';
      const duration = nextMode === 'work' ? timerMinutes * 60 : 5 * 60;
      setTimerMode(nextMode);
      setTimerSeconds(duration);
      setTimerTotalDuration(duration);
      setTimerActive(false);

      // System notification on finish
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(timerMode === 'work' ? '🏆 Work Block Completed!' : '💪 Break Finished!', {
            body: timerMode === 'work' ? 'Great job! Time to take a short break.' : 'Time to focus again!',
            tag: 'sdet-copilot-timer-finish'
          });
        } catch (e) {}
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds, timerMode, timerMinutes, timerTotalDuration, showToast]);

  // Add/Save/Delete handlers
  function addPost(post) {
    setPosts((prev) => [post, ...prev]);
    showToast('Post added to your sheet!');
  }

  function savePost(updatedPost) {
    if (!Array.isArray(updatedPost.questions) || updatedPost.questions.length === 0) {
      const parsedQuestions = [];
      const lines = (updatedPost.content || '').split('\n');
      for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const cleaned = trimmed.replace(/^[-*•\d+[\.\)]\s*/, '').trim();
        if (cleaned) {
          parsedQuestions.push({
            text: cleaned,
            tag: updatedPost.tags?.[0] || 'General'
          });
        }
      }
      updatedPost.questions = parsedQuestions;
    }
    setPosts((prev) => prev.map((p) => p.id === updatedPost.id ? updatedPost : p));
    showToast('Post updated successfully!');
  }

  function deletePost(id) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    showToast('Post removed.', 'error');
  }

  function addTag(newTag) {
    if (!tags.includes(newTag)) {
      setTags((prev) => [...prev, newTag]);
      showToast(`Tag "${newTag}" created successfully!`);
    }
  }

  function saveNvidiaKey(key) {
    setNvidiaKey(key);
    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { nvidiaKey: key } })
    }).catch(err => console.error('Save config error:', err));
  }

  // Study Prep consolidation
  async function handleGeneratePrep() {
    const cleanKeywords = prepKeywords.trim();
    if (prepSelectedTags.length === 0 && !cleanKeywords) {
      showToast('Please select at least one tag or enter a keyword.', 'error');
      return;
    }

    const matchedQuestions = [];
    posts.forEach(post => {
      const qList = getPostQuestions(post);
      qList.forEach(q => {
        const hasTagMatch = prepSelectedTags.includes(q.tag);

        let hasKeywordMatch = false;
        if (cleanKeywords) {
          const words = cleanKeywords.toLowerCase().split(',').map(w => w.trim()).filter(Boolean);
          const textLower = q.text.toLowerCase();
          hasKeywordMatch = words.some(w => textLower.includes(w));
        }

        if (hasTagMatch || hasKeywordMatch) {
          matchedQuestions.push({
            text: q.text,
            tag: q.tag,
            company: post.author || 'Company'
          });
        }
      });
    });

    if (matchedQuestions.length === 0) {
      showToast('No matching questions found in your sheet.', 'error');
      setPrepGuide(null);
      return;
    }

    const contentToConsolidate = matchedQuestions
      .map((q) => `[Source: ${q.company}] [Topic: ${q.tag}]\n- ${q.text}`)
      .join('\n\n');

    setGeneratingPrep(true);
    setPrepGuide(null);

    try {
      const res = await fetch('/api/generate-study-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentToConsolidate,
          topics: prepSelectedTags.join(', ') || cleanKeywords,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate consolidated study guide.');

      if (data.guide) {
        setPrepGuide(data.guide);
        showToast('Unified study guide generated successfully!');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setGeneratingPrep(false);
    }
  }

  function copyPrepGuide() {
    if (!prepGuide) return;
    navigator.clipboard.writeText(prepGuide).then(() => {
      setCopiedPrep(true);
      showToast('Copied study guide to clipboard!');
      setTimeout(() => setCopiedPrep(false), 2000);
    });
  }

  function downloadPrepMarkdown() {
    if (!prepGuide) return;
    const blob = new Blob([prepGuide], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-prep-guide-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded study guide as Markdown!');
  }

  function handleStartTracking() {
    if (!prepGuide) return;
    setShowSaveBoardModal(true);
  }

  async function handleConfirmStartTracking(boardName) {
    if (!prepGuide) return;
    const parsed = parseQuestionsFromMarkdown(prepGuide);
    if (parsed.length === 0) {
      showToast('No questions found in the generated guide to track.', 'error');
      setShowSaveBoardModal(false);
      return;
    }

    setIsTrackingLoading(true);

    try {
      const res = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionsToPolish: parsed.map(q => q.text),
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to polish questions.');

      const polishedTexts = data.polishedQuestions || [];
      const questions = parsed.map((q, idx) => ({
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text: polishedTexts[idx] || q.text,
        category: q.category || 'General',
        status: 'To Do',
        notes: '',
        aiAnalysis: ''
      }));

      const newBoard = {
        id: `board_${Date.now()}`,
        name: boardName,
        questions
      };

      setTrackerBoards(prev => {
        const filteredPrev = prev.filter(b => !(b.id === 'default' && b.questions.length === 0));
        return [...filteredPrev, newBoard];
      });
      setActiveBoardId(newBoard.id);
      setActiveTab('tracker');
      showToast(`Successfully created study board "${boardName}" with ${questions.length} polished questions!`);
      setShowSaveBoardModal(false);
    } catch (err) {
      console.error('Failed to track questions:', err);
      showToast(`Error polishing questions: ${err.message}`, 'error');
    } finally {
      setIsTrackingLoading(false);
    }
  }

  useEffect(() => {
    if (posts.length > 0) {
      let updated = false;
      const nextTags = [...tags];
      posts.forEach(p => {
        const pTags = getPostQuestions(p).map(q => q.tag);
        pTags.forEach(t => {
          if (t && !nextTags.includes(t)) {
            nextTags.push(t);
            updated = true;
          }
        });
      });
      if (updated) setTags(nextTags);
    }
  }, [posts]);

  if (!mounted) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <span className="spinner" style={{ width: 48, height: 48 }} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <div className="logo">
          <div className="logo-icon">🎯</div>
          <span className="logo-text">SDET Co-Pilot</span>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setFetcherOpen(true);
            setFetcherStep('config');
            setFetchedQuestions([]);
            setFetcherTargetBoard(activeBoardId || '');
          }}
          style={{ padding: '6px 12px', fontSize: 12 }}
        >
          🌐 Live Fetch
        </button>
      </div>

      {/* Sidebar Navigation (Visible on Desktop only) */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div>
          <div
            className="sidebar-logo"
            style={{ margin: '0 0 24px 0', padding: '0 8px', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            🎯 <span>SDET Co-Pilot</span>
          </div>

          <nav className="sidebar-menu">
            <div
              className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
              title={sidebarCollapsed ? 'Dashboard' : ''}
            >
              📊 <span>Dashboard</span>
            </div>
            <div
              className={`sidebar-item ${activeTab === 'resources' ? 'active' : ''}`}
              onClick={() => setActiveTab('resources')}
              title={sidebarCollapsed ? 'Study Resources' : ''}
            >
              📋 <span>Study Resources</span>
            </div>
            <div
              className={`sidebar-item ${activeTab === 'prep' ? 'active' : ''}`}
              onClick={() => setActiveTab('prep')}
              title={sidebarCollapsed ? 'Prep Generator' : ''}
            >
              🎯 <span>Prep Generator</span>
            </div>
            <div
              className={`sidebar-item ${activeTab === 'tracker' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracker')}
              title={sidebarCollapsed ? 'Progress Tracker' : ''}
            >
              📅 <span>Progress Tracker</span>
            </div>
            <div
              className={`sidebar-item ${activeTab === 'flashcards' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('flashcards');
                setFlashcardFlipped(false);
              }}
              title={sidebarCollapsed ? 'Flashcards' : ''}
            >
              🎴 <span>Flashcards</span>
            </div>
            <div
              className={`sidebar-item ${activeTab === 'mock-interview' ? 'active' : ''}`}
              onClick={() => setActiveTab('mock-interview')}
              title={sidebarCollapsed ? 'Mock Interview' : ''}
            >
              🎙️ <span>Mock Interview</span>
            </div>
            <div
              className={`sidebar-item ${activeTab === 'focus-timer' ? 'active' : ''}`}
              onClick={() => setActiveTab('focus-timer')}
              title={sidebarCollapsed ? 'Focus Clock' : ''}
            >
              ⏱️ <span>Focus Clock</span>
            </div>

            <div
              className="sidebar-item sidebar-item-fetch"
              onClick={() => {
                setFetcherOpen(true);
                setFetcherStep('config');
                setFetchedQuestions([]);
                setFetcherTargetBoard(activeBoardId || '');
              }}
              title={sidebarCollapsed ? 'Fetch Live Questions' : ''}
            >
              🌐 <span>Fetch Live Q&amp;As</span>
            </div>
          </nav>
        </div>

        <div className="sidebar-footer">
          {!sidebarCollapsed ? (
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              style={{ width: '100%', justifyContent: 'center', gap: 8 }}
            >
              {theme === 'dark' ? '🌙 Night Mode' : '☀️ Day Mode'}
            </button>
          ) : (
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              style={{ width: 42, height: 42, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
              title={theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {activeTab === 'dashboard' && (
          <DashboardTab
            posts={posts}
            trackerBoards={trackerBoards}
            activeBoardId={activeBoardId}
            setActiveBoardId={setActiveBoardId}
            setActiveTab={setActiveTab}
            targetDate={targetDate}
            setTargetDate={setTargetDate}
            dailyGoal={dailyGoal}
            setDailyGoal={setDailyGoal}
            studyDates={studyDates}
            setShowModal={setShowModal}
            downloadCSV={downloadCSV}
          />
        )}

        {activeTab === 'resources' && (
          <ResourcesTab
            posts={posts}
            tags={tags}
            setShowModal={setShowModal}
            setViewingPost={setViewingPost}
            setPostToEdit={setPostToEdit}
            deletePost={deletePost}
          />
        )}

        {activeTab === 'prep' && (
          <PrepTab
            tags={tags}
            prepSelectedTags={prepSelectedTags}
            setPrepSelectedTags={setPrepSelectedTags}
            prepKeywords={prepKeywords}
            setPrepKeywords={setPrepKeywords}
            prepGuide={prepGuide}
            copiedPrep={copiedPrep}
            generatingPrep={generatingPrep}
            handleGeneratePrep={handleGeneratePrep}
            copyPrepGuide={copyPrepGuide}
            downloadPrepMarkdown={downloadPrepMarkdown}
            handleStartTracking={handleStartTracking}
          />
        )}

        {activeTab === 'tracker' && (
          <TrackerTab
            trackerBoards={trackerBoards}
            setTrackerBoards={setTrackerBoards}
            activeBoardId={activeBoardId}
            setActiveBoardId={setActiveBoardId}
            showAddQuestionInline={showAddQuestionInline}
            setShowAddQuestionInline={setShowAddQuestionInline}
            newQuestionText={newQuestionText}
            setNewQuestionText={setNewQuestionText}
            newQuestionCategory={newQuestionCategory}
            setNewQuestionCategory={setNewQuestionCategory}
            focusMonitorActive={focusMonitorActive}
            setFocusMonitorActive={setFocusMonitorActive}
            setLastInteractionTime={setLastInteractionTime}
            showToast={showToast}
            tags={tags}
            setActiveTab={setActiveTab}
            updateActiveBoardQuestions={updateActiveBoardQuestions}
            setActiveTrackerTask={setActiveTrackerTask}
          />
        )}

        {activeTab === 'flashcards' && (
          <FlashcardsTab
            flashcardBoardId={flashcardBoardId}
            setFlashcardBoardId={setFlashcardBoardId}
            flashcardIndex={flashcardIndex}
            setFlashcardIndex={setFlashcardIndex}
            flashcardFlipped={flashcardFlipped}
            setFlashcardFlipped={setFlashcardFlipped}
            trackerBoards={trackerBoards}
            setTrackerBoards={setTrackerBoards}
            showToast={showToast}
          />
        )}

        {activeTab === 'mock-interview' && (
          <MockInterviewTab
            mockBoardId={mockBoardId}
            setMockBoardId={setMockBoardId}
            mockQCount={mockQCount}
            setMockQCount={setMockQCount}
            mockQuestions={mockQuestions}
            setMockQuestions={setMockQuestions}
            mockAnswers={mockAnswers}
            setMockAnswers={setMockAnswers}
            mockIndex={mockIndex}
            setMockIndex={setMockIndex}
            mockActive={mockActive}
            setMockActive={setMockActive}
            mockCompleted={mockCompleted}
            setMockCompleted={setMockCompleted}
            mockReport={mockReport}
            setMockReport={setMockReport}
            mockEvaluating={mockEvaluating}
            setMockEvaluating={setMockEvaluating}
            mockRecording={mockRecording}
            setMockRecording={setMockRecording}
            mockCurrentAnswer={mockCurrentAnswer}
            setMockCurrentAnswer={setMockCurrentAnswer}
            trackerBoards={trackerBoards}
            showToast={showToast}
            logStudyActivity={logStudyActivity}
          />
        )}
        {activeTab === 'focus-timer' && (
          <FocusClockTab
            timerMinutes={timerMinutes}
            setTimerMinutes={setTimerMinutes}
            timerSeconds={timerSeconds}
            setTimerSeconds={setTimerSeconds}
            timerActive={timerActive}
            setTimerActive={setTimerActive}
            timerMode={timerMode}
            setTimerMode={setTimerMode}
            timerTotalDuration={timerTotalDuration}
            setTimerTotalDuration={setTimerTotalDuration}
            showToast={showToast}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Visible on mobile/tablet ≤ 992px) */}
      <nav className="mobile-bottom-nav">
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="mobile-nav-icon">📊</span>
          <span className="mobile-nav-label">Dashboard</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          <span className="mobile-nav-icon">📋</span>
          <span className="mobile-nav-label">Resources</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'prep' ? 'active' : ''}`}
          onClick={() => setActiveTab('prep')}
        >
          <span className="mobile-nav-icon">🎯</span>
          <span className="mobile-nav-label">Prep</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'tracker' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracker')}
        >
          <span className="mobile-nav-icon">📅</span>
          <span className="mobile-nav-label">Tracker</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'flashcards' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('flashcards');
            setFlashcardFlipped(false);
          }}
        >
          <span className="mobile-nav-icon">🎴</span>
          <span className="mobile-nav-label">Cards</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'mock-interview' ? 'active' : ''}`}
          onClick={() => setActiveTab('mock-interview')}
        >
          <span className="mobile-nav-icon">🎙️</span>
          <span className="mobile-nav-label">Interview</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'focus-timer' ? 'active' : ''}`}
          onClick={() => setActiveTab('focus-timer')}
        >
          <span className="mobile-nav-icon">⏱️</span>
          <span className="mobile-nav-label">Clock</span>
        </button>
      </nav>

      {/* Modals & Dialogs overlays */}
      {showModal && (
        <AddPostModal
          onClose={() => {
            setShowModal(false);
            setInitialImportData(null);
          }}
          onSave={addPost}
          tags={tags}
          onAddTag={addTag}
          initialData={initialImportData}
          nvidiaKeyProp={nvidiaKey}
          onSaveNvidiaKey={saveNvidiaKey}
        />
      )}

      {postToEdit && (
        <AddPostModal
          onClose={() => setPostToEdit(null)}
          onSave={savePost}
          tags={tags}
          onAddTag={addTag}
          initialData={postToEdit}
          isEdit={true}
          nvidiaKeyProp={nvidiaKey}
          onSaveNvidiaKey={saveNvidiaKey}
        />
      )}

      {viewingPost && (
        <ViewPostModal
          post={viewingPost}
          onClose={() => setViewingPost(null)}
        />
      )}

      {activeTrackerTask && (
        <TrackerTaskModal
          task={activeTrackerTask}
          onClose={() => setActiveTrackerTask(null)}
          onUpdate={(updatedTask) => {
            updateActiveBoardQuestions(prev => prev.map(item => item.id === updatedTask.id ? updatedTask : item));
            showToast('Question updated successfully!');
          }}
          tags={tags}
          nvidiaKeyProp={nvidiaKey}
          showToast={showToast}
        />
      )}

      {showSaveBoardModal && (
        <SaveBoardModal
          onClose={() => setShowSaveBoardModal(false)}
          onConfirm={handleConfirmStartTracking}
          defaultName="New Study Guide"
          loading={isTrackingLoading}
        />
      )}

      <CommunityQuestionsFetcher
        fetcherOpen={fetcherOpen}
        setFetcherOpen={setFetcherOpen}
        fetcherStep={fetcherStep}
        setFetcherStep={setFetcherStep}
        fetcherExp={fetcherExp}
        setFetcherExp={setFetcherExp}
        fetcherSources={fetcherSources}
        setFetcherSources={setFetcherSources}
        fetcherLoading={fetcherLoading}
        fetchedQuestions={fetchedQuestions}
        setFetchedQuestions={setFetchedQuestions}
        selectedFetched={selectedFetched}
        setSelectedFetched={setSelectedFetched}
        fetcherTargetBoard={fetcherTargetBoard}
        setFetcherTargetBoard={setFetcherTargetBoard}
        fetcherMeta={fetcherMeta}
        activeBoardId={activeBoardId}
        trackerBoards={trackerBoards}
        handleFetchQuestions={handleFetchQuestions}
        handleImportFetched={handleImportFetched}
      />

      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
