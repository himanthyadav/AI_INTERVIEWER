const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const http = require('http');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();


if (!global.fetch) {
  global.fetch = fetch;
  global.Headers = fetch.Headers;
  global.Request = fetch.Request;
  global.Response = fetch.Response;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


app.use(cors());
app.use(express.json());

const User = require('./models/User');
const Interview = require('./models/Interview');


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const isGeminiQuotaOrRateLimitError = (error) => {
  const message = (error?.message || '').toLowerCase();
  return message.includes('429') || message.includes('quota') || message.includes('rate limit');
};

const AI_REPLY_TIMEOUT_MS = Number(process.env.AI_REPLY_TIMEOUT_MS || 8000);
const AI_REPORT_TIMEOUT_MS = Number(process.env.AI_REPORT_TIMEOUT_MS || 12000);

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'for', 'in', 'on', 'of', 'and', 'or', 'with', 'it', 'that', 'this', 'i', 'you', 'we', 'they', 'he', 'she', 'my', 'your', 'our', 'as', 'at', 'by', 'from', 'be', 'have', 'has', 'had'
]);

const withTimeout = (promise, timeoutMs, errorMessage) => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    })
  ]).finally(() => clearTimeout(timer));
};

const isAiResponseTimeoutError = (error) => {
  const message = (error?.message || '').toLowerCase();
  return message.includes('timed out') || message.includes('timeout');
};

const tokenize = (text = '') => String(text)
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter((word) => word && !STOP_WORDS.has(word));

const limitWords = (text = '', maxWords = 12) => String(text)
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, maxWords)
  .join(' ');

const getRoleRubricPoints = (role = '') => {
  const normalizedRole = String(role).toLowerCase();

  if (normalizedRole.includes('frontend') || normalizedRole.includes('ui') || normalizedRole.includes('ux')) {
    return 'component design, state management, performance optimization, accessibility';
  }
  if (normalizedRole.includes('backend') || normalizedRole.includes('api')) {
    return 'api design, database modeling, error handling, scalability';
  }
  if (normalizedRole.includes('data') || normalizedRole.includes('ml')) {
    return 'problem framing, metric selection, data quality, model/analysis validation';
  }
  if (normalizedRole.includes('devops') || normalizedRole.includes('sre')) {
    return 'ci cd, observability, incident handling, reliability improvements';
  }
  if (normalizedRole.includes('security') || normalizedRole.includes('cyber')) {
    return 'threat identification, risk prioritization, mitigation strategy, validation';
  }
  if (normalizedRole.includes('product')) {
    return 'problem discovery, prioritization, trade-offs, measurable product outcomes';
  }

  return 'problem solving, communication clarity, technical reasoning, measurable outcomes';
};

const inferAnswerQuality = (userMessage = '', lastAiQuestion = '') => {
  const answerTokens = tokenize(userMessage);
  const answerLength = answerTokens.length;
  const unsure = /don't know|do not know|not sure|no idea|can't recall|cannot recall/i.test(userMessage);

  if (unsure) return 'unsure';
  if (answerLength <= 6) return 'too_short';

  return 'adequate';
};

const isEndInterviewIntent = (text = '') => {
  const normalized = String(text).toLowerCase().trim();
  const endIntentPatterns = [
    /\bend (the )?interview\b/,
    /\bstop (the )?interview\b/,
    /\bfinish (the )?interview\b/,
    /\binterview is over\b/,
    /\bi am done\b/,
    /\bi'm done\b/,
    /\bthat's all\b/,
    /\bthat is all\b/,
    /\bquit interview\b/,
    /\bcan we stop\b/
  ];

  return endIntentPatterns.some((pattern) => pattern.test(normalized));
};

const INTERVIEW_FLOW_STAGES = [
  {
    key: 'welcome',
    title: 'Step 1: Welcome',
    objective: 'Set the context and ask for a short introduction.',
    question: 'Introduce yourself briefly and mention the role you are targeting.'
  },
  {
    key: 'background',
    title: 'Step 2: Background',
    objective: 'Understand the candidate\'s current experience and strengths.',
    question: 'What has been your most relevant experience for this role so far?'
  },
  {
    key: 'projects',
    title: 'Step 3: Project Deep Dive',
    objective: 'Explore one project and the candidate\'s exact contribution.',
    question: 'Tell me about one project you worked on, what you built, and your specific role.'
  },
  {
    key: 'technical',
    title: 'Step 4: Technical Reasoning',
    objective: 'Check technical decisions, trade-offs, and implementation details.',
    question: 'What technical choice did you make in that project, and why did you choose it?'
  },
  {
    key: 'problem_solving',
    title: 'Step 5: Problem Solving',
    objective: 'Understand how the candidate handles challenges or bugs.',
    question: 'Describe one difficult problem you solved and how you approached it.'
  },
  {
    key: 'behavioral',
    title: 'Step 6: Wrap-Up',
    objective: 'Assess communication, teamwork, and one area for improvement.',
    question: 'How do you handle feedback or pressure, and what are you improving now?'
  }
];

const getInterviewStageInfo = (interview) => {
  const userAnswers = interview?.chatTranscript?.filter((item) => item.role === 'user') || [];
  const stageIndex = Math.min(userAnswers.length, INTERVIEW_FLOW_STAGES.length - 1);
  const stage = INTERVIEW_FLOW_STAGES[stageIndex];

  return {
    stageIndex,
    stage,
    stepNumber: stageIndex + 1,
    totalSteps: INTERVIEW_FLOW_STAGES.length
  };
};

const buildFeedbackPrompt = ({ interview, stage, stageInfo, recentContext, message, answerQuality }) => `You are an expert mock interviewer.
Role: ${interview.position}
Difficulty: ${interview.difficulty}
Candidate experience: ${interview.experience}
Current stage: ${stageInfo.stepNumber}/${stageInfo.totalSteps} - ${stage.title}
Stage objective: ${stage.objective}
Focus rubric: ${getRoleRubricPoints(interview.position)}
Answer quality hint: ${answerQuality}

Recent context:
${recentContext}

Latest candidate answer:
"${message}"

Return only one short feedback line.
Rules:
- Max 10 words.
- No question mark.
- No bullets, no extra text.
`;

const getRoleFocusedFollowUp = (role = '') => {
  const normalizedRole = String(role).toLowerCase();

  if (normalizedRole.includes('frontend') || normalizedRole.includes('ui') || normalizedRole.includes('ux')) {
    return 'What specific UI optimization improved performance the most?';
  }
  if (normalizedRole.includes('backend') || normalizedRole.includes('api')) {
    return 'How did you design error handling and retries for your APIs?';
  }
  if (normalizedRole.includes('data') || normalizedRole.includes('ml')) {
    return 'Which metric best proved your analysis or model was successful?';
  }
  if (normalizedRole.includes('devops') || normalizedRole.includes('sre')) {
    return 'What change improved deployment reliability or rollback safety?';
  }
  if (normalizedRole.includes('security') || normalizedRole.includes('cyber')) {
    return 'How did you identify and mitigate the highest-risk vulnerability?';
  }
  if (normalizedRole.includes('product')) {
    return 'How did you prioritize trade-offs and measure product impact?';
  }

  return 'Can you share one measurable result from that experience?';
};

const getStageQuestion = ({ stage, role = '', answerQuality = 'adequate', lastAiQuestion = '' }) => {
  const normalizedRole = String(role).toLowerCase();

  if (answerQuality === 'unsure') {
    return stage?.key === 'welcome'
      ? 'Please introduce yourself briefly and mention the role you want.'
      : 'Could you explain that with one simple real example?';
  }

  if (answerQuality === 'too_short') {
    return stage?.key === 'welcome'
      ? 'Please introduce yourself briefly and mention the role you want.'
      : 'Please answer with one specific example and your exact role in it.';
  }

  if (stage?.key === 'welcome') {
    return 'Introduce yourself briefly and mention the role you are targeting.';
  }

  if (stage?.key === 'background') {
    return 'What has been your most relevant experience for this role so far?';
  }

  if (stage?.key === 'projects') {
    return 'Tell me about one project you worked on, what you built, and your role.';
  }

  if (stage?.key === 'technical') {
    if (normalizedRole.includes('frontend') || normalizedRole.includes('ui') || normalizedRole.includes('ux')) {
      return 'What UI or state-management decision had the biggest impact on your app?';
    }
    if (normalizedRole.includes('backend') || normalizedRole.includes('api')) {
      return 'What API or database decision improved reliability or scalability most?';
    }
    if (normalizedRole.includes('data') || normalizedRole.includes('ml')) {
      return 'What metric or validation method did you rely on most?';
    }
    if (normalizedRole.includes('devops') || normalizedRole.includes('sre')) {
      return 'What change improved deployment reliability or rollback safety?';
    }
    if (normalizedRole.includes('security') || normalizedRole.includes('cyber')) {
      return 'What vulnerability or risk did you mitigate first, and why?';
    }
    if (normalizedRole.includes('product')) {
      return 'What trade-off did you make, and how did you measure the impact?';
    }
    return getRoleFocusedFollowUp(role);
  }

  if (stage?.key === 'problem_solving') {
    if (normalizedRole.includes('frontend') || normalizedRole.includes('ui') || normalizedRole.includes('ux')) {
      return 'Describe one UI bug or performance issue you solved and how you fixed it.';
    }
    if (normalizedRole.includes('backend') || normalizedRole.includes('api')) {
      return 'Describe one backend bug or failure you solved and how you fixed it.';
    }
    if (normalizedRole.includes('data') || normalizedRole.includes('ml')) {
      return 'Describe one data or model problem you solved and how you validated the fix.';
    }
    return 'Describe one difficult problem you solved and how you approached it.';
  }

  if (stage?.key === 'behavioral') {
    return 'How do you handle feedback or pressure, and what are you improving now?';
  }

  if (lastAiQuestion) {
    return limitWords(lastAiQuestion, 16);
  }

  return stage?.question || 'Could you give one concrete example?';
};

const getStageFallbackQuestion = (stage, role = '') => {
  const roleQuestion = getRoleFocusedFollowUp(role);

  if (stage?.key === 'welcome') {
    return 'Please introduce yourself briefly and mention the role you are targeting.';
  }
  if (stage?.key === 'background') {
    return 'What has been your most relevant experience for this role so far?';
  }
  if (stage?.key === 'projects') {
    return 'Tell me about one project you worked on, what you built, and your specific role.';
  }
  if (stage?.key === 'technical') {
    return roleQuestion;
  }
  if (stage?.key === 'problem_solving') {
    return 'Describe one difficult problem you solved and how you approached it.';
  }
  if (stage?.key === 'behavioral') {
    return 'How do you handle feedback or pressure, and what are you improving now?';
  }

  return roleQuestion;
};

const sanitizeInterviewerReply = (rawText, role) => {
  const cleaned = String(rawText || '')
    .replace(/\s+/g, ' ')
    .replace(/\*\*/g, '')
    .trim();

  const followUp = getRoleFocusedFollowUp(role);
  if (!cleaned) return `Good start, add one concrete detail.\n${followUp}`;

  const sentenceParts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const firstLine = sentenceParts[0] || 'Good answer, now add specific depth.';
  const secondLine = sentenceParts.find((part) => part.includes('?')) || followUp;

  const cappedFirstLine = limitWords(firstLine, 12);
  const cappedSecondLine = limitWords(secondLine, 16);
  return `${cappedFirstLine}\n${cappedSecondLine.endsWith('?') ? cappedSecondLine : `${cappedSecondLine}?`}`;
};

const parseStructuredInterviewerReply = (rawText, role) => {
  const text = String(rawText || '').replace(/\*\*/g, '').trim();
  const feedbackMatch = text.match(/feedback\s*:\s*(.+)/i);
  const questionMatch = text.match(/question\s*:\s*(.+)/i);

  if (feedbackMatch || questionMatch) {
    const feedback = limitWords(feedbackMatch?.[1] || 'Good answer, add one measurable impact.', 12);
    const questionRaw = questionMatch?.[1] || getRoleFocusedFollowUp(role);
    const question = limitWords(questionRaw, 16);
    return `${feedback}\n${question.endsWith('?') ? question : `${question}?`}`;
  }

  return sanitizeInterviewerReply(text, role);
};

const buildFallbackInterviewerReply = (interview, userMessage = '', lastAiQuestion = '', stage = null) => {
  const quality = inferAnswerQuality(userMessage, lastAiQuestion);
  const roleFollowUp = getStageQuestion({ stage, role: interview?.position, answerQuality: quality, lastAiQuestion });

  if (quality === 'unsure') {
    return `No problem, let's simplify this.\n${roleFollowUp}`;
  }

  if (quality === 'too_short') {
    return `Good start, add more depth in one concrete example.\n${roleFollowUp}`;
  }

  return `Nice progress, now go one layer deeper.\n${roleFollowUp}`;
};

const getAverageResponseLengthBucket = (messages) => {
  if (!messages.length) return 'short';
  const totalWords = messages.reduce((sum, msg) => sum + String(msg.message || '').trim().split(/\s+/).filter(Boolean).length, 0);
  const avgWords = totalWords / messages.length;
  if (avgWords < 20) return 'short';
  if (avgWords < 60) return 'medium';
  return 'long';
};

const getPerformanceLevel = (score) => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Average';
  return 'Needs Improvement';
};

const buildFallbackReport = (interview) => {
  const userAnswers = interview.chatTranscript.filter(c => c.role === 'user');
  const aiQuestions = interview.chatTranscript.filter(c => c.role === 'ai');
  const overallScore = Math.max(50, Math.min(82, 58 + userAnswers.length * 3));
  const technicalScore = Math.max(45, Math.min(80, 55 + userAnswers.length * 3));
  const communicationScore = Math.max(50, Math.min(85, 60 + userAnswers.length * 3));
  const confidenceScore = Math.max(50, Math.min(82, 57 + userAnswers.length * 3));
  const problemSolvingScore = Math.max(45, Math.min(80, 54 + userAnswers.length * 3));

  return {
    interviewId: interview._id,
    position: interview.position,
    experience: interview.experience,
    difficulty: interview.difficulty,
    interviewDate: interview.createdAt,
    overallScore,
    strengths: [
      'Maintained interview flow and responded consistently.',
      'Demonstrated engagement throughout the conversation.',
      'Provided responses that can be expanded with more detail.'
    ],
    weaknesses: [
      'Some answers can be more structured with clear examples.',
      'Add measurable outcomes when describing projects.',
      'Use STAR format for behavioral scenarios.'
    ],
    technicalScore,
    communicationScore,
    confidenceScore,
    problemSolvingScore,
    detailedFeedback: 'A backup report was generated because the AI analysis service was temporarily unavailable. Your interview data is saved correctly, and this report provides a practical estimate based on your transcript activity.',
    recommendations: [
      'Use specific project examples with constraints and outcomes.',
      'Explain trade-offs before giving final technical decisions.',
      'Practice concise introductions and strong closing summaries.'
    ],
    questionsAsked: aiQuestions.length,
    answersGiven: userAnswers.length,
    averageResponseLength: getAverageResponseLengthBucket(userAnswers),
    interviewDuration: `${Math.max(5, Math.ceil((userAnswers.length + aiQuestions.length) * 1.5))}-${Math.max(8, Math.ceil((userAnswers.length + aiQuestions.length) * 2))} minutes`,
    performanceLevel: getPerformanceLevel(overallScore)
  };
};

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// ============= REST APIs =============

// 1. Signup API
app.post('/api/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const user = new User({ firstName, lastName, email, password });
    await user.save();
    
    res.status(201).json({ 
      message: 'User created successfully',
      userId: user._id 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 2. Login API
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    res.json({ 
      message: 'Login successful',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 2.1 Guest Session API
app.post('/api/guest-login', async (req, res) => {
  try {
    const token = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
    const guestUser = new User({
      firstName: 'Guest',
      lastName: token.slice(-4),
      email: `guest_${token}@ai.local`,
      password: token
    });

    await guestUser.save();

    res.status(201).json({
      message: 'Guest session created',
      user: {
        id: guestUser._id,
        firstName: guestUser.firstName,
        lastName: guestUser.lastName,
        email: guestUser.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 3. Get User Details API
app.get('/api/user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 3.1 Update User Profile API
app.patch('/api/user/:userId/profile', async (req, res) => {
  try {
    const allowedFields = [
      'firstName',
      'lastName',
      'degree',
      'collegeName',
      'graduationYear',
      'phone',
      'location',
      'targetRole',
      'skills',
      'linkedinUrl',
      'githubUrl',
      'bio'
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(updates, 'skills')) {
      if (Array.isArray(updates.skills)) {
        updates.skills = updates.skills.map((item) => String(item).trim()).filter(Boolean);
      } else if (typeof updates.skills === 'string') {
        updates.skills = updates.skills.split(',').map((item) => item.trim()).filter(Boolean);
      } else {
        updates.skills = [];
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 4. Start Interview API
app.post('/api/interview/start', async (req, res) => {
  try {
    const { userId, position, experience, difficulty, duration } = req.body;
    
    const interview = new Interview({
      userId,
      position,
      experience,
      difficulty,
      duration: duration || '15 mins',
      isStart: true,
      currentStageIndex: -1,
      lastAskedQuestion: '',
      chatTranscript: []
    });
    
    await interview.save();
    
    res.status(201).json({ 
      message: 'Interview started',
      interviewId: interview._id 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 4.1 Get Interview By ID API
app.get('/api/interview/:interviewId', async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.interviewId).select('position experience difficulty duration isStart currentStageIndex lastAskedQuestion chatTranscript createdAt');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    res.json({ interview });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 5. Stop Interview API
app.post('/api/interview/stop/:interviewId', async (req, res) => {
  try {
    const interview = await Interview.findByIdAndUpdate(
      req.params.interviewId,
      { isStart: false },
      { new: true }
    );
    
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    
    res.json({ 
      message: 'Interview stopped',
      interview 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 6. Get User Interviews API
app.get('/api/interviews/user/:userId', async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.params.userId })
      .sort({ createdAt: -1 }); // Most recent first
    
    res.json({ 
      message: 'Interviews retrieved successfully',
      count: interviews.length,
      interviews 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 7. Generate Interview Report API
app.post('/api/interview/report/:interviewId', async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.interviewId);
    
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    
    const transcript = interview.chatTranscript
      .map(chat => `${chat.role.toUpperCase()}: ${chat.message}`)
      .join('\n\n');
    
    const prompt = `You are an expert interview analyst. Analyze the following job interview transcript and provide a detailed performance report.

Interview Details:
- Position: ${interview.position}
- Experience Level: ${interview.experience}
- Difficulty: ${interview.difficulty}

Transcript:
${transcript}

Provide a comprehensive analysis in the following JSON format (respond ONLY with valid JSON, no additional text):
{
  "overallScore": <number between 0-100>,
  "strengths": [<array of 3-5 key strengths>],
  "weaknesses": [<array of 3-5 areas for improvement>],
  "technicalScore": <number between 0-100>,
  "communicationScore": <number between 0-100>,
  "confidenceScore": <number between 0-100>,
  "problemSolvingScore": <number between 0-100>,
  "detailedFeedback": "<comprehensive feedback paragraph>",
  "recommendations": [<array of 3-5 specific recommendations>],
  "questionsAsked": <number of questions asked by interviewer>,
  "answersGiven": <number of answers given by candidate>,
  "averageResponseLength": "<short/medium/long>",
  "interviewDuration": "<estimated duration based on conversation>",
  "performanceLevel": "<Excellent/Good/Average/Needs Improvement>"
}`;

    const result = await withTimeout(
      model.generateContent(prompt),
      AI_REPORT_TIMEOUT_MS,
      'AI report generation timed out'
    );
    const aiResponse = result.response.text();
    
    
    let reportData;
    try {
      
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      reportData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      
      reportData = {
        overallScore: 70,
        strengths: ["Completed the interview", "Responded to questions", "Showed engagement"],
        weaknesses: ["Could provide more detailed responses"],
        technicalScore: 70,
        communicationScore: 70,
        confidenceScore: 70,
        problemSolvingScore: 70,
        detailedFeedback: "The interview was conducted successfully. Continue practicing to improve your skills.",
        recommendations: ["Practice more technical questions", "Improve response clarity", "Research the company thoroughly"],
        questionsAsked: interview.chatTranscript.filter(c => c.role === 'ai').length,
        answersGiven: interview.chatTranscript.filter(c => c.role === 'user').length,
        averageResponseLength: "medium",
        interviewDuration: "15-20 minutes",
        performanceLevel: "Good"
      };
    }
    
    // Add interview details to the report
    const fullReport = {
      interviewId: interview._id,
      position: interview.position,
      experience: interview.experience,
      difficulty: interview.difficulty,
      interviewDate: interview.createdAt,
      ...reportData
    };
    
    res.json({ 
      message: 'Report generated successfully',
      report: fullReport
    });
  } catch (error) {
    console.error('Report generation error:', error);

    try {
      const interview = await Interview.findById(req.params.interviewId);
      if (!interview) {
        return res.status(404).json({ message: 'Interview not found' });
      }

      const fallbackReport = buildFallbackReport(interview);
      return res.json({
        message: 'Report generated using backup mode',
        report: fallbackReport,
        fallback: true
      });
    } catch (fallbackError) {
      console.error('Fallback report error:', fallbackError);
    }

    res.status(500).json({ message: 'Error generating report', error: error.message });
  }
});

// 8. Delete Single Interview API
app.delete('/api/interview/:interviewId', async (req, res) => {
  try {
    const deletedInterview = await Interview.findByIdAndDelete(req.params.interviewId);

    if (!deletedInterview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    res.json({ message: 'Interview deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 9. Clear All User Interviews API
app.delete('/api/interviews/user/:userId', async (req, res) => {
  try {
    const result = await Interview.deleteMany({ userId: req.params.userId });

    res.json({
      message: 'Interview history cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============= Socket.IO for Real-time Interview =============

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  // Join interview room
  socket.on('join-interview', async (data) => {
    const { interviewId } = data;
    socket.join(interviewId);
    console.log(`User joined interview: ${interviewId}`);
    
    // Send initial greeting
    const interview = await Interview.findById(interviewId);
    const stageIndex = Math.max(0, interview?.currentStageIndex ?? -1);
    const stageInfo = {
      stageIndex,
      stage: INTERVIEW_FLOW_STAGES[stageIndex] || INTERVIEW_FLOW_STAGES[0],
      stepNumber: 1,
      totalSteps: INTERVIEW_FLOW_STAGES.length
    };
    const greeting = `Welcome to your ${interview.position} interview.\nGive a short intro, then we\'ll begin.`;

    if (!(interview.chatTranscript || []).some((chat) => chat.role === 'ai')) {
      await Interview.findByIdAndUpdate(interviewId, {
        $push: {
          chatTranscript: {
            role: 'ai',
            message: greeting,
            timestamp: new Date()
          }
        }
        ,
        $set: {
          currentStageIndex: 0,
          lastAskedQuestion: greeting
        }
      });
    }

    socket.emit('ai-response', {
      message: greeting,
      stage: stageInfo.stage.title,
      stageObjective: stageInfo.stage.objective,
      step: stageInfo.stepNumber,
      totalSteps: stageInfo.totalSteps
    });
  });
  
  // Handle user's voice/text message
  socket.on('user-message', async (data) => {
    try {
      const { interviewId, message } = data;

      if (isEndInterviewIntent(message)) {
        const closingMessage = 'Understood. Ending this interview now. Your session has been saved.';

        await Interview.findByIdAndUpdate(interviewId, {
          isStart: false,
          $push: {
            chatTranscript: {
              role: 'user',
              message,
              timestamp: new Date()
            }
          }
        });

        await Interview.findByIdAndUpdate(interviewId, {
          $push: {
            chatTranscript: {
              role: 'ai',
              message: closingMessage,
              timestamp: new Date()
            }
          }
        });

        socket.emit('ai-response', { message: closingMessage });
        socket.emit('interview-ended', { interviewId, reason: 'user_requested' });
        return;
      }
      
      // Save user message to database
      await Interview.findByIdAndUpdate(interviewId, {
        $push: {
          chatTranscript: {
            role: 'user',
            message: message,
            timestamp: new Date()
          }
        }
      });
      
      // Get interview context
      const interview = await Interview.findById(interviewId);
      const currentStageIndex = typeof interview?.currentStageIndex === 'number' ? interview.currentStageIndex : -1;
      const nextStageIndex = Math.min(currentStageIndex + 1, INTERVIEW_FLOW_STAGES.length - 1);
      const stageInfo = {
        stageIndex: nextStageIndex,
        stage: INTERVIEW_FLOW_STAGES[nextStageIndex],
        stepNumber: nextStageIndex + 1,
        totalSteps: INTERVIEW_FLOW_STAGES.length
      };
      const lastAiQuestion = [...interview.chatTranscript]
        .reverse()
        .find((chat) => chat.role === 'ai')?.message || '';
      const answerQualityHint = inferAnswerQuality(message, lastAiQuestion);
      const stage = stageInfo.stage;
      
      // Generate focused, low-latency AI response.
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.35,
          topP: 0.8,
          maxOutputTokens: 90
        }
      });

      const recentContext = interview.chatTranscript
        .slice(-6)
        .map((chat) => `${chat.role.toUpperCase()}: ${chat.message}`)
        .join('\n');

      const prompt = buildFeedbackPrompt({
        interview,
        stage,
        stageInfo,
        recentContext,
        message,
        answerQuality: answerQualityHint
      });

      const result = await withTimeout(
        model.generateContent(prompt),
        AI_REPLY_TIMEOUT_MS,
        'AI response timed out'
      );
      const aiFeedback = limitWords(String(result.response.text() || '').replace(/feedback\s*:\s*/i, '').replace(/question\s*:\s*/i, '').replace(/\*/g, '').trim(), 10);
      const stageQuestion = getStageQuestion({
        stage,
        role: interview.position,
        answerQuality: answerQualityHint,
        lastAiQuestion
      });
      const aiResponse = `${aiFeedback || 'Good answer'}\n${stageQuestion.endsWith('?') ? stageQuestion : `${stageQuestion}?`}`;
      
      // Save AI response to database
      await Interview.findByIdAndUpdate(interviewId, {
        $push: {
          chatTranscript: {
            role: 'ai',
            message: aiResponse,
            timestamp: new Date()
          }
        }
      });
      
      // Send AI response back to user
      socket.emit('ai-response', {
        message: aiResponse,
        stage: stage.title,
        stageObjective: stage.objective,
        step: stageInfo.stepNumber,
        totalSteps: stageInfo.totalSteps
      });

      await Interview.findByIdAndUpdate(interviewId, {
        $set: {
          currentStageIndex: stageInfo.stageIndex,
          lastAskedQuestion: stageQuestion
        }
      });
      
    } catch (error) {
      console.error('Error:', error);

      try {
        const { interviewId, message } = data;
        const interview = await Interview.findById(interviewId);
        const currentStageIndex = typeof interview?.currentStageIndex === 'number' ? interview.currentStageIndex : -1;
        const nextStageIndex = Math.min(currentStageIndex + 1, INTERVIEW_FLOW_STAGES.length - 1);
        const stageInfo = {
          stageIndex: nextStageIndex,
          stage: INTERVIEW_FLOW_STAGES[nextStageIndex],
          stepNumber: nextStageIndex + 1,
          totalSteps: INTERVIEW_FLOW_STAGES.length
        };
        const stage = stageInfo.stage;
        const lastAiQuestion = [...(interview?.chatTranscript || [])]
          .reverse()
          .find((chat) => chat.role === 'ai')?.message || '';
        const fallbackReply = buildFallbackInterviewerReply(interview, message, lastAiQuestion, stage);

        await Interview.findByIdAndUpdate(interviewId, {
          $push: {
            chatTranscript: {
              role: 'ai',
              message: fallbackReply,
              timestamp: new Date()
            }
          }
        });

        socket.emit('ai-response', {
          message: fallbackReply,
          stage: stage?.title || 'Interview',
          stageObjective: stage?.objective || 'Continue with the interview flow.',
          step: stageInfo.stepNumber,
          totalSteps: stageInfo.totalSteps
        });

        await Interview.findByIdAndUpdate(interviewId, {
          $set: {
            currentStageIndex: stageInfo.stageIndex,
            lastAskedQuestion: fallbackReply.split('\n')[1] || stage?.question || ''
          }
        });
        return;
      } catch (fallbackError) {
        console.error('Fallback reply error:', fallbackError);
      }

      socket.emit('error', { message: 'Unable to generate AI response right now. Please try again in a few seconds.' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});