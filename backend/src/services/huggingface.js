// HuggingFace Inference Providers — OpenAI-compatible Chat Completions
// Correct base URL as of 2025: https://router.huggingface.co/v1
// Docs: https://huggingface.co/docs/inference-providers/en/tasks/chat-completion
//
// IMPORTANT: Your HF token must be a fine-grained token with
// "Make calls to Inference Providers" permission enabled.
// Create one at: https://huggingface.co/settings/tokens/new?tokenType=fineGrained
//
// Appending :cheapest to the model name lets the router auto-pick
// the cheapest available provider — avoids "model not supported" errors.

const HF_BASE_URL = 'https://router.huggingface.co/v1';

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Models tried in order. Each has :cheapest suffix so HF router picks
// whatever provider currently has that model available for free/cheapest.
const MODEL_PRIORITY = [
  'meta-llama/Llama-3.1-8B-Instruct:cheapest',
  'mistralai/Mistral-7B-Instruct-v0.3:cheapest',
  'Qwen/Qwen2.5-7B-Instruct:cheapest',
  'microsoft/Phi-3-mini-4k-instruct:cheapest',
  'HuggingFaceH4/zephyr-7b-beta:cheapest',
  'meta-llama/Llama-3.2-3B-Instruct:cheapest',
];

const CHAT_MODEL = process.env.HF_CHAT_MODEL || MODEL_PRIORITY[0];
const EVAL_MODEL  = process.env.HF_EVAL_MODEL  || MODEL_PRIORITY[0];

/**
 * Call HuggingFace router chat-completions endpoint.
 * Auto-falls-back through MODEL_PRIORITY on 400/404/503.
 */
async function callHuggingFace(model, systemPrompt, userPrompt, options = {}) {
  if (!HF_API_KEY) {
    throw new Error('HUGGINGFACE_API_KEY not set in backend/.env');
  }

  // Build the full try-list: requested model first, then all fallbacks
  const baseModel = model.split(':')[0]; // strip any existing suffix
  const allModels = [
    `${baseModel}:cheapest`,
    ...MODEL_PRIORITY.filter(m => !m.startsWith(baseModel))
  ];

  let lastError = null;

  for (const tryModel of allModels) {
    try {
      console.log(`[HF] Trying model: ${tryModel}`);

      const response = await fetch(`${HF_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: tryModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   }
          ],
          max_tokens:  options.maxTokens  || 512,
          temperature: options.temperature || 0.7,
          top_p: 0.9,
          stream: false,
        })
      });

      if (!response.ok) {
        const errText = await response.text();

        // Token permission error — no point retrying different models
        if (response.status === 401) {
          throw new Error(
            'HuggingFace 401: Invalid token or missing "Make calls to Inference Providers" permission.\n' +
            'Create a fine-grained token at https://huggingface.co/settings/tokens/new?tokenType=fineGrained'
          );
        }

        // Model not on this provider / overloaded — try next
        if (response.status === 400 || response.status === 404 || response.status === 503) {
          console.warn(`[HF] Model ${tryModel} unavailable (${response.status}): ${errText.substring(0, 120)}`);
          lastError = new Error(`${tryModel}: HTTP ${response.status}`);
          continue;
        }

        throw new Error(`HuggingFace API error ${response.status}: ${errText}`);
      }

      const result = await response.json();
      const text = result?.choices?.[0]?.message?.content;
      if (text) {
        console.log(`[HF] Success with model: ${tryModel}`);
        return text.trim();
      }

      throw new Error('Empty response from model');

    } catch (err) {
      // Re-throw hard errors immediately (401, explicit API errors)
      if (err.message.startsWith('HuggingFace') || err.message.startsWith('HuggingFace 401')) {
        throw err;
      }
      lastError = err;
      console.warn(`[HF] ${tryModel} failed: ${err.message}`);
    }
  }

  throw lastError || new Error('All HuggingFace models failed. Check your token permissions and try again.');
}

async function generateInterviewQuestions({ role, difficulty, resumeContext, count = 5 }) {
  const difficultyMap = {
    easy: 'basic, beginner-friendly',
    medium: 'intermediate-level',
    hard: 'advanced, challenging'
  };

  const difficultyDesc = difficultyMap[difficulty] || 'intermediate-level';

  const systemPrompt = `You are an expert technical interviewer. Your job is to generate interview questions. 
Return ONLY a numbered list of questions — no preamble, no commentary, no markdown formatting.`;

  let userPrompt = `Generate exactly ${count} ${difficultyDesc} interview questions for a ${role} position.
Mix behavioral, technical, and situational questions appropriate for this role.`;

  if (resumeContext) {
    userPrompt += `\n\nCandidate resume context: ${resumeContext.substring(0, 500)}
Also include questions about their specific experience, projects, and any employment gaps mentioned.`;
  }

  userPrompt += `\n\nFormat — output only this, nothing else:\n1. [question]\n2. [question]\n...`;

  const text = await callHuggingFace(CHAT_MODEL, systemPrompt, userPrompt, { maxTokens: 700 });

  // Parse numbered questions
  const lines = text.split('\n').filter(line => line.trim());
  const questions = [];
  for (const line of lines) {
    const match = line.match(/^\d+[\.\)]\s+(.+)/);
    if (match) {
      questions.push(match[1].trim());
    }
  }

  // Fallback if parsing fails
  if (questions.length === 0) {
    return getFallbackQuestions(role, count);
  }

  return questions.slice(0, count);
}

async function evaluateAnswer({ question, answer, role, difficulty }) {
  const systemPrompt = `You are an expert interviewer who evaluates candidate answers. 
You MUST respond with ONLY a valid JSON object — no markdown, no backticks, no extra text before or after.`;

  const userPrompt = `Evaluate this interview answer for a ${role} position (difficulty: ${difficulty}).

Question: ${question}

Candidate's Answer: ${answer}

Respond with ONLY this JSON (fill in the values):
{
  "score": <integer 1-5>,
  "rating": "<Excellent|Good|Fair|Poor|Very Poor>",
  "strengths": ["<specific strength>", "<specific strength>"],
  "improvements": ["<specific improvement>", "<specific improvement>"],
  "betterAnswer": "<a concise 2-3 sentence improved answer>",
  "keywords": ["<missed key term>", "<missed key term>"]
}

Scoring: 5=Excellent, 4=Good, 3=Fair, 2=Poor, 1=Very Poor.`;

  try {
    const text = await callHuggingFace(EVAL_MODEL, systemPrompt, userPrompt, { maxTokens: 600, temperature: 0.3 });

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Validate fields
      return {
        score: Math.min(5, Math.max(1, parseInt(parsed.score) || 3)),
        rating: parsed.rating || 'Fair',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Attempted the question'],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : ['Provide more detail'],
        betterAnswer: parsed.betterAnswer || 'Consider providing a more structured response.',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : []
      };
    }
    throw new Error('No JSON in response');
  } catch (err) {
    console.error('Evaluation parsing error:', err.message);
    // Fallback evaluation
    return generateFallbackEvaluation(answer);
  }
}

async function generateFollowUpQuestion({ role, previousQ, previousA, difficulty }) {
  const systemPrompt = `You are a professional interviewer. Generate a single follow-up question. Output ONLY the question text — nothing else.`;

  const userPrompt = `Interview role: ${role}
Previous question: ${previousQ}
Candidate's answer: ${previousA.substring(0, 300)}

Generate ONE specific follow-up question that probes deeper into their answer or clarifies a gap.`;

  try {
    const text = await callHuggingFace(CHAT_MODEL, systemPrompt, userPrompt, { maxTokens: 120, temperature: 0.6 });
    // Clean up the response - take first sentence/question
    const cleaned = text.split('\n')[0].replace(/^(Question:|Follow-up:|Q:)\s*/i, '').trim();
    return cleaned || null;
  } catch {
    return null;
  }
}

async function generateSessionSummary({ role, difficulty, answers, scores }) {
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const scoreText = scores.map((s, i) => `Q${i + 1}: ${s}/5`).join(', ');

  const systemPrompt = `You are an interview coach writing performance summaries. 
Respond with ONLY a valid JSON object — no markdown, no backticks, no extra text.`;

  const userPrompt = `Write a performance summary for a ${role} interview candidate.

Scores: ${scoreText}
Average: ${avgScore.toFixed(1)}/5
Difficulty: ${difficulty}
Questions attempted: ${answers.length}

Respond with ONLY this JSON:
{
  "overallRating": "<Excellent|Good|Average|Below Average|Poor>",
  "summary": "<2-3 sentence overall assessment>",
  "topStrengths": ["<strength>", "<strength>", "<strength>"],
  "areasToImprove": ["<area>", "<area>", "<area>"],
  "recommendation": "<hire recommendation and next steps>",
  "studyTopics": ["<topic>", "<topic>", "<topic>"]
}`;

  try {
    const text = await callHuggingFace(CHAT_MODEL, systemPrompt, userPrompt, { maxTokens: 500, temperature: 0.4 });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON');
  } catch {
    return {
      overallRating: avgScore >= 4 ? 'Good' : avgScore >= 3 ? 'Average' : 'Below Average',
      summary: `The candidate attempted ${answers.length} questions with an average score of ${avgScore.toFixed(1)}/5.`,
      topStrengths: ['Attempted all questions', 'Showed initiative', 'Engaged with the process'],
      areasToImprove: ['Provide more detailed answers', 'Use specific examples', 'Structure responses better'],
      recommendation: 'Continue practicing and review core concepts.',
      studyTopics: [`${role} fundamentals`, 'Behavioral questions (STAR method)', 'Technical depth']
    };
  }
}

function getFallbackQuestions(role, count) {
  const generic = [
    `Tell me about yourself and why you're interested in this ${role} role.`,
    `What are your greatest strengths relevant to this ${role} position?`,
    `Describe a challenging project you worked on and how you overcame obstacles.`,
    `Where do you see yourself in 5 years within this field?`,
    `How do you handle tight deadlines and multiple priorities?`,
    `Describe a time you had to learn something new quickly. How did you approach it?`,
    `What motivates you in your professional work?`,
    `How do you handle constructive criticism from team members?`
  ];
  return generic.slice(0, count);
}

function generateFallbackEvaluation(answer) {
  const wordCount = answer.trim().split(/\s+/).length;
  let score = 2;
  if (wordCount > 50) score = 3;
  if (wordCount > 100) score = 4;

  return {
    score,
    rating: score >= 4 ? 'Good' : score >= 3 ? 'Fair' : 'Poor',
    strengths: ['Provided a response', wordCount > 50 ? 'Demonstrated some detail' : 'Attempted the question'],
    improvements: ['Add more specific examples', 'Structure your answer better (STAR method)', 'Include technical details'],
    betterAnswer: 'A stronger answer would include a specific situation, your actions taken, and the measurable result achieved.',
    keywords: []
  };
}

module.exports = {
  generateInterviewQuestions,
  evaluateAnswer,
  generateFollowUpQuestion,
  generateSessionSummary
};
