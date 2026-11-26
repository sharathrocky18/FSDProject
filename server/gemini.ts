import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export const GEMINI_MODEL = 'gemini-4-hydrogen';
export const FALLBACK_MODELS = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
export const EMBEDDING_MODEL = 'gemini-embedding-2';

const ATTEMPT_TIMEOUT_MS = 20000;

function getApiKey(): string {
  return (process.env.GEMINI_API_KEY || '').trim();
}

export function getAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: getApiKey(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractCleanErrorMessage(err: any): string {
  const raw = err?.message || String(err || 'Gemini API call failed');
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // not JSON, continue
  }
  return raw;
}

function isRetryableError(err: any): boolean {
  const msg = (err?.message || '').toLowerCase();
  const status = err?.status || err?.code;
  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 504 ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('resource_exhausted') ||
    msg.includes('429')
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function parseJsonResponse<T>(rawText: string, fallback: T): T {
  const trimmed = (rawText || '').trim();
  if (!trimmed) return fallback;

  // Strip optional markdown code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate) as T;
  } catch {
    // Attempt to locate outermost JSON array or object
    const arrStart = candidate.indexOf('[');
    const arrEnd = candidate.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd > arrStart) {
      try {
        return JSON.parse(candidate.slice(arrStart, arrEnd + 1)) as T;
      } catch {
        // continue
      }
    }
    const objStart = candidate.indexOf('{');
    const objEnd = candidate.lastIndexOf('}');
    if (objStart !== -1 && objEnd > objStart) {
      try {
        return JSON.parse(candidate.slice(objStart, objEnd + 1)) as T;
      } catch {
        // continue
      }
    }
    throw new Error('The AI returned an unexpected response format. Please try again.');
  }
}

export interface GroundingSource {
  title: string;
  uri: string;
}

function extractGroundingSources(response: any): GroundingSource[] {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];

  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);

    let fallbackTitle = uri;
    try {
      fallbackTitle = new URL(uri).hostname.replace(/^www\./, '');
    } catch {
      // keep uri
    }

    sources.push({
      title: (chunk?.web?.title || fallbackTitle).trim(),
      uri,
    });
  }

  return sources.slice(0, 8);
}

async function generateWithFallback(
  buildParams: (model: string) => any
): Promise<{ text: string; sources: GroundingSource[] }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured on the server.');
  }

  const ai = getAiClient();
  let lastError: any = null;

  // Try primary + fast fallback, plus one retry on lite if busy
  const attempts = [...FALLBACK_MODELS, 'gemini-3.1-flash-lite'];

  for (let i = 0; i < attempts.length; i++) {
    const model = attempts[i];
    const params = buildParams(model);

    // Apply ThinkingLevel.LOW on gemini-4-hydrogen for fast, responsive non-tool answers
    if (model === 'gemini-4-hydrogen' && !params?.config?.tools) {
      params.config = {
        ...(params.config || {}),
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      };
    }

    try {
      const response = await withTimeout(
        ai.models.generateContent(params),
        ATTEMPT_TIMEOUT_MS,
        `Gemini (${model})`
      );
      return {
        text: response.text || '',
        sources: extractGroundingSources(response),
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini] Attempt ${i + 1} (${model}) failed:`, extractCleanErrorMessage(err));
      if (!isRetryableError(err) && !String(err?.message || '').includes('NOT_FOUND')) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
    }
  }

  throw new Error(extractCleanErrorMessage(lastError));
}

/**
 * Context-aware Gemini Chatbot with real-time Google Search Grounding (answers any question)
 */
export async function generateChatResponse(
  conversationHistory: { role: 'user' | 'model'; text: string }[],
  latestPrompt: string,
  subjectContext?: string,
  useSearch = true,
  userContext?: { fullName?: string; course?: string; collegeName?: string }
): Promise<{ text: string; sources: GroundingSource[]; searchGrounded: boolean; searchError?: string }> {
  const hasSpecificSubject =
    subjectContext &&
    !subjectContext.toLowerCase().includes('any') &&
    !subjectContext.toLowerCase().includes('general');

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const buildSystemInstruction = (searchActive: boolean) => `You are StudySync Gemini Chatbot, a context-aware AI assistant powered by Google Gemini${searchActive ? ' with live Google Search grounding' : ''}. Today's date is ${todayStr}.
Guidelines:
- Answer ANY type of question the user asks—current events, science, history, math, programming, debugging, writing, definitions, general knowledge, and college coursework.
- Use prior conversation turns to stay context-aware during follow-up questions.
${searchActive ? '- Use Google Search grounding to retrieve up-to-date facts and web sources when helpful.' : '- Provide the most accurate, helpful, up-to-date answer you know clearly and directly.'}
- Never refuse general or educational questions.
- Give clear, well-structured answers using paragraphs, bullet points, or numbered steps when helpful.
- For math questions, show clear step-by-step solutions.
- For coding questions, provide clean, working code in fenced code blocks and explain how it works.
${userContext?.course ? `- Context note: the user is studying ${userContext.course}${userContext.collegeName ? ` at ${userContext.collegeName}` : ''} (only use this if relevant to their question).` : ''}
${hasSpecificSubject ? `- Topic context: ${subjectContext}.` : ''}`;

  // Sanitize turns: must start with 'user' and strictly alternate user/model
  const rawTurns = [
    ...conversationHistory.filter((msg) => msg.text && msg.text.trim().length > 0).slice(-16),
    { role: 'user' as const, text: latestPrompt.trim() },
  ];

  const sanitized: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const turn of rawTurns) {
    if (sanitized.length === 0 && turn.role !== 'user') {
      continue;
    }
    const prev = sanitized[sanitized.length - 1];
    if (prev && prev.role === turn.role) {
      prev.parts[0].text += `\n\n${turn.text}`;
    } else {
      sanitized.push({
        role: turn.role,
        parts: [{ text: turn.text }],
      });
    }
  }

  if (useSearch && getApiKey()) {
    try {
      const ai = getAiClient();
      const response = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: sanitized,
          config: {
            systemInstruction: buildSystemInstruction(true),
            tools: [{ googleSearch: {} }],
          },
        }),
        ATTEMPT_TIMEOUT_MS,
        'Gemini Search Grounding'
      );
      const sources = extractGroundingSources(response);
      return {
        text: response.text || 'I could not generate a response. Please try rephrasing your question.',
        sources,
        searchGrounded: true,
      };
    } catch (err: any) {
      const errMsg = extractCleanErrorMessage(err);
      console.warn('[Gemini] Search-grounded attempt unavailable, using standard Gemini response:', errMsg);
      const fallbackResult = await generateWithFallback((model) => ({
        model,
        contents: sanitized,
        config: {
          systemInstruction: buildSystemInstruction(false),
        },
      }));
      return {
        text: fallbackResult.text || 'I could not generate a response. Please try rephrasing your question.',
        sources: [],
        searchGrounded: false,
        searchError: errMsg,
      };
    }
  }

  const standardResult = await generateWithFallback((model) => ({
    model,
    contents: sanitized,
    config: {
      systemInstruction: buildSystemInstruction(false),
    },
  }));

  return {
    text: standardResult.text || 'I could not generate a response. Please try rephrasing your question.',
    sources: [],
    searchGrounded: false,
  };
}

/**
 * Generates an embedding vector for text chunking / RAG
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!getApiKey()) {
    return Array.from({ length: 32 }, (_, i) => Math.sin(text.length + i) * 0.1);
  }

  try {
    const ai = getAiClient();
    const response: any = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });

    const values = response.embedding?.values || response.embeddings?.[0]?.values;
    return values || Array.from({ length: 32 }, () => 0.01);
  } catch (err) {
    console.warn('Embedding generation warning, falling back to heuristic vector:', err);
    return Array.from({ length: 32 }, (_, i) => Math.sin(text.length + i) * 0.1);
  }
}

export interface AnalyzedTopic {
  id: string;
  title: string;
  summary: string;
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  keyConcepts: string[];
  howToLearn: string[];
  practiceTip: string;
}

/**
 * Analyze an uploaded PDF or notes file with Gemini and generate a topic-by-topic learning breakdown
 */
export async function analyzeUploadedDocument(input: {
  fileName: string;
  mimeType?: string;
  base64Data?: string;
  textContent?: string;
}): Promise<{
  title: string;
  overview: string;
  extractedText: string;
  topics: AnalyzedTopic[];
}> {
  const analysisPrompt = `Analyze the uploaded study document ("${input.fileName}") thoroughly and create a structured learning breakdown for a student.
Return JSON matching the schema:
- title: Clean, concise title for the document (without file extension).
- overview: 2-4 sentence summary of the document and the recommended learning sequence.
- extractedText: Comprehensive, clean plain-text study digest of all major definitions, formulas, facts, and sections in the document (used for follow-up Q&A search).
- topics: Break the material into 3 to 7 logical learning topics. For EACH topic provide:
  - title: Topic name.
  - summary: 1-2 sentences explaining what this topic covers.
  - difficulty: One of "Foundational", "Intermediate", or "Advanced".
  - estimatedMinutes: Realistic study time in minutes (integer, e.g. 20, 35, 45).
  - keyConcepts: 3 to 5 essential concepts or terms to know.
  - howToLearn: 3 to 4 concrete, step-by-step instructions explaining HOW the student should learn and master this topic effectively.
  - practiceTip: 1 practical self-test, problem, or recall exercise for this topic.`;

  const isPdfInline =
    input.base64Data &&
    (input.mimeType === 'application/pdf' || input.fileName.toLowerCase().endsWith('.pdf'));

  const contentsPayload = isPdfInline
    ? {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: input.base64Data!,
            },
          },
          { text: analysisPrompt },
        ],
      }
    : `${analysisPrompt}\n\nDOCUMENT CONTENT:\n${(input.textContent || '').slice(0, 80000)}`;

  const result = await generateWithFallback((model) => ({
    model,
    contents: contentsPayload,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          overview: { type: Type.STRING },
          extractedText: { type: Type.STRING },
          topics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                estimatedMinutes: { type: Type.INTEGER },
                keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
                howToLearn: { type: Type.ARRAY, items: { type: Type.STRING } },
                practiceTip: { type: Type.STRING },
              },
              required: [
                'title',
                'summary',
                'difficulty',
                'estimatedMinutes',
                'keyConcepts',
                'howToLearn',
                'practiceTip',
              ],
            },
          },
        },
        required: ['title', 'overview', 'extractedText', 'topics'],
      },
    },
  }));

  const parsed = parseJsonResponse<{
    title?: string;
    overview?: string;
    extractedText?: string;
    topics?: any[];
  }>(result.text || '{}', {});

  const cleanTitle = (parsed.title || input.fileName.replace(/\.[^/.]+$/, '')).trim();
  const rawTopics = Array.isArray(parsed.topics) ? parsed.topics : [];

  const topics: AnalyzedTopic[] = rawTopics.map((t, idx) => {
    const diff =
      t?.difficulty === 'Foundational' ||
      t?.difficulty === 'Intermediate' ||
      t?.difficulty === 'Advanced'
        ? t.difficulty
        : 'Intermediate';
    return {
      id: `topic-${Date.now()}-${idx}`,
      title: String(t?.title || `Topic ${idx + 1}`).trim(),
      summary: String(t?.summary || '').trim(),
      difficulty: diff,
      estimatedMinutes:
        typeof t?.estimatedMinutes === 'number' && t.estimatedMinutes > 0
          ? Math.round(t.estimatedMinutes)
          : 25,
      keyConcepts: Array.isArray(t?.keyConcepts) ? t.keyConcepts.map(String) : [],
      howToLearn: Array.isArray(t?.howToLearn) ? t.howToLearn.map(String) : [],
      practiceTip: String(t?.practiceTip || 'Summarize this topic in your own words without looking at notes.').trim(),
    };
  });

  const fallbackText =
    parsed.extractedText?.trim() ||
    input.textContent?.trim() ||
    [parsed.overview || '', ...topics.map((t) => `${t.title}: ${t.summary} ${t.keyConcepts.join(', ')}`)].join('\n\n');

  return {
    title: cleanTitle,
    overview: parsed.overview?.trim() || `Structured study breakdown generated for ${input.fileName}.`,
    extractedText: fallbackText,
    topics,
  };
}

/**
 * Ask questions against retrieved PDF context (RAG) with optional follow-up history
 */
export async function answerWithPdfContext(
  userQuestion: string,
  documentTitle: string,
  retrievedChunks: { content: string; pageNumber?: number; chunkIndex: number }[],
  priorMessages: { sender: 'user' | 'assistant'; content: string }[] = []
): Promise<{ answer: string; references: { pageNumber?: number; snippet: string }[] }> {
  const contextText = retrievedChunks
    .map(
      (c, idx) =>
        `[Source Excerpt #${idx + 1}${c.pageNumber ? ` - Page ${c.pageNumber}` : ''}]:\n${c.content}\n`
    )
    .join('\n---\n');

  const systemInstruction = `You are the StudySync Document & PDF Notes Assistant.
Your task is to analyze the provided document excerpts from "${documentTitle}" and answer the user's question accurately, clearly, and helpfully.
Guidelines:
- Ground your answer primarily in the provided document excerpts.
- Use prior Q&A turns for context when answering follow-up questions.
- Cite the excerpt/page number where available.
- Format with clean Markdown headings, paragraphs, and bullet points.`;

  const historySnippet =
    priorMessages.length > 0
      ? `RECENT CONVERSATION:\n${priorMessages
          .slice(-6)
          .map((m) => `${m.sender === 'user' ? 'Student' : 'Assistant'}: ${m.content}`)
          .join('\n')}\n\n`
      : '';

  const prompt = `DOCUMENT CONTEXT EXCERPTS:
${contextText}

${historySnippet}CURRENT QUESTION:
${userQuestion}`;

  const result = await generateWithFallback((model) => ({
    model,
    contents: prompt,
    config: {
      systemInstruction,
    },
  }));

  const references = retrievedChunks.map((c) => ({
    pageNumber: c.pageNumber,
    snippet: c.content.slice(0, 160) + '...',
  }));

  return {
    answer: result.text || 'No answer generated from context.',
    references,
  };
}

/**
 * Generate Multiple Choice Questions (Quiz)
 */
export async function generateQuiz(
  topic: string,
  subject: string,
  difficulty: 'easy' | 'medium' | 'hard',
  questionCount: number
): Promise<{ question: string; options: string[]; correctOptionIndex: number; explanation: string }[]> {
  const prompt = `Generate exactly ${questionCount} multiple-choice academic quiz questions for college students on the topic: "${topic}" in the subject "${subject}".
Difficulty level: ${difficulty}.
For each question:
- Provide 4 distinct, plausible options.
- Indicate the 0-based index of the single correct option.
- Provide a clear, educational explanation of why that answer is correct and why other choices are misconceptions.`;

  const result = await generateWithFallback((model) => ({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            correctOptionIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
          },
          required: ['question', 'options', 'correctOptionIndex', 'explanation'],
        },
      },
    },
  }));

  const parsed = parseJsonResponse<
    { question: string; options: string[]; correctOptionIndex: number; explanation: string }[]
  >(result.text || '[]', []);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Could not generate quiz questions for this topic. Please try again.');
  }

  return parsed.map((q) => {
    const opts = Array.isArray(q.options) && q.options.length >= 2 ? q.options.slice(0, 4) : ['Option A', 'Option B', 'Option C', 'Option D'];
    const idx =
      typeof q.correctOptionIndex === 'number' &&
      q.correctOptionIndex >= 0 &&
      q.correctOptionIndex < opts.length
        ? q.correctOptionIndex
        : 0;
    return {
      question: q.question || 'Question',
      options: opts,
      correctOptionIndex: idx,
      explanation: q.explanation || 'Review the core concept for this topic.',
    };
  });
}

/**
 * Generate Flashcards
 */
export async function generateFlashcards(
  topic: string,
  subject: string,
  count = 6
): Promise<{ question: string; answer: string }[]> {
  const prompt = `Generate ${count} high-yield study flashcards for a university exam on "${topic}" (${subject}).
Each flashcard must contain:
- question: A crisp, targeted conceptual question or scenario.
- answer: A concise, accurate explanation with key terminology and principles.`;

  const result = await generateWithFallback((model) => ({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING },
          },
          required: ['question', 'answer'],
        },
      },
    },
  }));

  const parsed = parseJsonResponse<{ question: string; answer: string }[]>(result.text || '[]', []);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Could not generate flashcards for this topic. Please try again.');
  }
  return parsed;
}

export interface GeneratedBasicConcept {
  title: string;
  explanation: string;
  whyItMatters: string;
}

export interface GeneratedTopicRoadmapItem {
  order: number;
  topicTitle: string;
  estimatedHours: number;
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced';
  basicIdea: string;
  keyPoints: string[];
  studySteps: string[];
  practiceGoal: string;
}

export interface GeneratedStudyPlanSlot {
  dayOfWeek: string;
  timeSlot: string;
  subjectName: string;
  topicFocus: string;
  taskTitle: string;
}

/**
 * Generate Personalized AI Study Plan with Basic Concepts + Topic-Wise Breakdown
 */
export async function generateStudyPlan(input: {
  subjectFocus?: string;
  topicFocus?: string;
  availableHoursDaily: number;
  subjects: string[];
  learningGoals: string;
  examDates: string;
  currentPrepLevel: string;
}): Promise<{
  goalSummary: string;
  basicConcepts: GeneratedBasicConcept[];
  topicRoadmap: GeneratedTopicRoadmapItem[];
  slots: GeneratedStudyPlanSlot[];
}> {
  const focusSubject = (input.subjectFocus || '').trim();
  const focusTopic = (input.topicFocus || '').trim();
  const focusSummary =
    focusSubject && focusTopic
      ? `Subject "${focusSubject}" — specifically Topic "${focusTopic}"`
      : focusTopic
      ? `Topic "${focusTopic}"`
      : focusSubject
      ? `Subject "${focusSubject}"`
      : `Enrolled subjects (${input.subjects.join(', ')})`;

  const prompt = `You are an expert university academic tutor and study strategist.
A student wants a complete, structured preparation plan for: ${focusSummary}.

Student context:
- Daily available study hours: ${input.availableHoursDaily} hours/day
- Current preparation level: ${input.currentPrepLevel}
- Target learning goal / exam context: ${input.learningGoals}
- Timeline / exam window: ${input.examDates}

Create a structured preparation plan in JSON matching the schema:
1. goalSummary: Concise 1-2 sentence roadmap summary explaining how the student will master ${focusSummary}.
2. basicConcepts: 3 to 5 fundamental prerequisite or basic concepts the student MUST understand first before diving deep. For each basic concept provide:
   - title: Clear concept name
   - explanation: Beginner-friendly, intuitive explanation in 1-2 plain sentences
   - whyItMatters: 1 sentence explaining how this concept unlocks the rest of the topic/subject
3. topicRoadmap: Break ${focusSummary} into 4 to 6 ordered, topic-wise learning modules progressing from foundational basics to exam-ready mastery. For each topic provide:
   - order: Integer starting at 1
   - topicTitle: Clear module/topic name
   - estimatedHours: Realistic study hours needed (number, e.g. 1.5, 2, 3)
   - difficulty: Exactly one of "Foundational", "Intermediate", or "Advanced"
   - basicIdea: 1-2 sentences explaining the basic concept of this subtopic simply
   - keyPoints: 3 to 4 essential definitions, rules, formulas, or sub-ideas
   - studySteps: 3 concrete step-by-step instructions on how to study and practice this topic
   - practiceGoal: 1 concrete self-check or problem-solving milestone
4. slots: 6 to 8 daily study schedule blocks across Monday through Saturday that map directly to the topicRoadmap above (include dayOfWeek, timeSlot like "09:00 - 10:30", subjectName, topicFocus matching a topicTitle, and actionable taskTitle).`;

  const result = await generateWithFallback((model) => ({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          goalSummary: { type: Type.STRING },
          basicConcepts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                explanation: { type: Type.STRING },
                whyItMatters: { type: Type.STRING },
              },
              required: ['title', 'explanation', 'whyItMatters'],
            },
          },
          topicRoadmap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                order: { type: Type.INTEGER },
                topicTitle: { type: Type.STRING },
                estimatedHours: { type: Type.NUMBER },
                difficulty: { type: Type.STRING },
                basicIdea: { type: Type.STRING },
                keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                studySteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                practiceGoal: { type: Type.STRING },
              },
              required: [
                'order',
                'topicTitle',
                'estimatedHours',
                'difficulty',
                'basicIdea',
                'keyPoints',
                'studySteps',
                'practiceGoal',
              ],
            },
          },
          slots: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dayOfWeek: { type: Type.STRING },
                timeSlot: { type: Type.STRING },
                subjectName: { type: Type.STRING },
                topicFocus: { type: Type.STRING },
                taskTitle: { type: Type.STRING },
              },
              required: ['dayOfWeek', 'timeSlot', 'subjectName', 'topicFocus', 'taskTitle'],
            },
          },
        },
        required: ['goalSummary', 'basicConcepts', 'topicRoadmap', 'slots'],
      },
    },
  }));

  const parsed = parseJsonResponse<{
    goalSummary?: string;
    basicConcepts?: any[];
    topicRoadmap?: any[];
    slots?: any[];
  }>(result.text || '{}', {});

  const basicConcepts: GeneratedBasicConcept[] = Array.isArray(parsed.basicConcepts)
    ? parsed.basicConcepts.map((c) => ({
        title: String(c?.title || 'Core Concept').trim(),
        explanation: String(c?.explanation || '').trim(),
        whyItMatters: String(c?.whyItMatters || '').trim(),
      }))
    : [];

  const topicRoadmap: GeneratedTopicRoadmapItem[] = Array.isArray(parsed.topicRoadmap)
    ? parsed.topicRoadmap.map((t, idx) => {
        const diff =
          t?.difficulty === 'Foundational' ||
          t?.difficulty === 'Intermediate' ||
          t?.difficulty === 'Advanced'
            ? t.difficulty
            : idx === 0
            ? 'Foundational'
            : 'Intermediate';
        return {
          order: typeof t?.order === 'number' && t.order > 0 ? Math.round(t.order) : idx + 1,
          topicTitle: String(t?.topicTitle || `Topic ${idx + 1}`).trim(),
          estimatedHours:
            typeof t?.estimatedHours === 'number' && t.estimatedHours > 0
              ? Number(t.estimatedHours.toFixed(1))
              : 1.5,
          difficulty: diff,
          basicIdea: String(t?.basicIdea || '').trim(),
          keyPoints: Array.isArray(t?.keyPoints) ? t.keyPoints.map(String) : [],
          studySteps: Array.isArray(t?.studySteps) ? t.studySteps.map(String) : [],
          practiceGoal: String(t?.practiceGoal || 'Complete practice problems and review notes.').trim(),
        };
      })
    : [];

  const slots: GeneratedStudyPlanSlot[] = Array.isArray(parsed.slots)
    ? parsed.slots.map((s) => ({
        dayOfWeek: String(s?.dayOfWeek || 'Monday').trim(),
        timeSlot: String(s?.timeSlot || '09:00 - 10:30').trim(),
        subjectName: String(s?.subjectName || focusSubject || 'Study Session').trim(),
        topicFocus: String(s?.topicFocus || focusTopic || '').trim(),
        taskTitle: String(s?.taskTitle || 'Focused study session').trim(),
      }))
    : [];

  return {
    goalSummary: (parsed.goalSummary || `Structured study plan for ${focusSummary}`).trim(),
    basicConcepts,
    topicRoadmap,
    slots,
  };
}
