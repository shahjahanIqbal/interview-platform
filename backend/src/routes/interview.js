const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const {
  generateInterviewQuestions,
  evaluateAnswer,
  generateFollowUpQuestion,
  generateSessionSummary
} = require('../services/huggingface');

// In-memory session store (use Redis in production)
const activeSessions = new Map();

// POST /api/interview/start - Start a new interview session
router.post('/start', async (req, res) => {
  try {
    const { role, difficulty, duration, mode, resumeContext } = req.body;

    if (!role) return res.status(400).json({ error: 'Role is required' });

    const sessionId = uuidv4();
    const questionCount = Math.max(3, Math.min(15, Math.floor((duration || 20) / 3)));

    // Generate questions
    const questions = await generateInterviewQuestions({
      role,
      difficulty: difficulty || 'medium',
      resumeContext,
      count: questionCount
    });

    const session = {
      id: sessionId,
      role,
      difficulty: difficulty || 'medium',
      mode: mode || 'text',
      duration: duration || null,
      startTime: Date.now(),
      endTime: duration ? Date.now() + duration * 60 * 1000 : null,
      questions,
      currentQuestionIndex: 0,
      answers: [],
      evaluations: [],
      transcript: [],
      status: 'active'
    };

    activeSessions.set(sessionId, session);

    res.json({
      sessionId,
      currentQuestion: questions[0],
      totalQuestions: questions.length,
      timeLimit: duration,
      endTime: session.endTime,
      role,
      difficulty
    });
  } catch (err) {
    console.error('Start interview error:', err);
    res.status(500).json({ error: err.message || 'Failed to start interview session' });
  }
});

// POST /api/interview/answer - Submit an answer and get evaluation
router.post('/answer', async (req, res) => {
  try {
    const { sessionId, answer, questionIndex } = req.body;

    if (!sessionId || !activeSessions.has(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = activeSessions.get(sessionId);

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    const currentQ = session.questions[session.currentQuestionIndex];

    // Add to transcript
    session.transcript.push({ role: 'interviewer', text: currentQ, timestamp: Date.now() });
    session.transcript.push({ role: 'candidate', text: answer, timestamp: Date.now() });

    // Evaluate answer
    const evaluation = await evaluateAnswer({
      question: currentQ,
      answer,
      role: session.role,
      difficulty: session.difficulty
    });

    session.answers.push(answer);
    session.evaluations.push({ ...evaluation, question: currentQ, answer });

    // Check if there are follow-up questions or next question
    let followUp = null;
    let nextQuestion = null;
    let isComplete = false;

    session.currentQuestionIndex++;

    if (session.currentQuestionIndex < session.questions.length) {
      nextQuestion = session.questions[session.currentQuestionIndex];
      // Occasionally generate a follow-up (20% chance if score is low)
      if (evaluation.score <= 2 && Math.random() < 0.3) {
        followUp = await generateFollowUpQuestion({
          role: session.role,
          previousQ: currentQ,
          previousA: answer,
          difficulty: session.difficulty
        });
      }
    } else {
      isComplete = true;
      session.status = 'completed';
    }

    const response = {
      evaluation,
      nextQuestion,
      followUpQuestion: followUp,
      questionNumber: session.currentQuestionIndex,
      totalQuestions: session.questions.length,
      isComplete
    };

    activeSessions.set(sessionId, session);
    res.json(response);
  } catch (err) {
    console.error('Answer submission error:', err);
    res.status(500).json({ error: err.message || 'Failed to process answer' });
  }
});

// POST /api/interview/end - End session early
router.post('/end', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || !activeSessions.has(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = activeSessions.get(sessionId);
    session.status = 'completed';
    session.endedAt = Date.now();
    activeSessions.set(sessionId, session);

    res.json({ success: true, message: 'Session ended' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// GET /api/interview/results/:sessionId - Get full results
router.get('/results/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!activeSessions.has(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = activeSessions.get(sessionId);
    const scores = session.evaluations.map(e => e.score);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Generate AI summary
    const summary = session.evaluations.length > 0
      ? await generateSessionSummary({
          role: session.role,
          difficulty: session.difficulty,
          answers: session.answers,
          scores
        })
      : null;

    const duration = session.endedAt
      ? Math.floor((session.endedAt - session.startTime) / 1000)
      : Math.floor((Date.now() - session.startTime) / 1000);

    res.json({
      sessionId,
      role: session.role,
      difficulty: session.difficulty,
      duration,
      mode: session.mode,
      totalQuestions: session.questions.length,
      questionsAttempted: session.answers.length,
      averageScore: parseFloat(avgScore.toFixed(2)),
      scores,
      evaluations: session.evaluations,
      transcript: session.transcript,
      summary,
      questions: session.questions
    });
  } catch (err) {
    console.error('Results error:', err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// GET /api/interview/session/:sessionId - Get current session state
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (!activeSessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const session = activeSessions.get(sessionId);
  res.json({
    status: session.status,
    currentQuestionIndex: session.currentQuestionIndex,
    totalQuestions: session.questions.length,
    endTime: session.endTime,
    role: session.role,
    difficulty: session.difficulty
  });
});

module.exports = router;
