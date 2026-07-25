const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getCachedResponse, setCachedResponse } = require('../utils/cache');

// Get Gemini API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Transforms messages from OpenAI format to Gemini format.
 * Gemini requires a flat history array and specific roles ('user' and 'model').
 * It also disallows consecutive messages from the same role.
 */
function transformMessagesForGemini(messages) {
  const history = [];
  let lastRole = '';

  for (const message of messages) {
    // Map 'assistant' role to 'model'
    const role = message.role === 'assistant' ? 'model' : 'user';
    const text = message.content;

    if (!text) continue;

    if (role === lastRole) {
      // If the last message has the same role, append the content.
      // This handles cases of consecutive user or assistant messages.
      const lastEntry = history[history.length - 1];
      lastEntry.parts[0].text += `\n${text}`;
    } else {
      // Otherwise, push a new entry.
      history.push({ role, parts: [{ text }] });
      lastRole = role;
    }
  }
  return history;
}

async function chatController(req, res) {
  try {
        const { messages = [], model = 'gemini-2.5-flash' } = req.body || {};

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        message: 'Gemini API key not configured on server.',
        type: 'configuration_error',
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        message: 'Messages array is required.',
        type: 'validation_error',
      });
    }

    // Check cache first
    const cachedResponse = getCachedResponse(messages);
    if (cachedResponse) {
      return res.status(200).json({ ...cachedResponse, cached: true });
    }

    const generativeModel = genAI.getGenerativeModel({ model });
    const history = transformMessagesForGemini(messages);
    
    // The last message is the new prompt
    const lastMessage = history.pop();
    if (!lastMessage || lastMessage.role !== 'user') {
        return res.status(400).json({ message: 'Last message must be from the user.' });
    }

    const chat = generativeModel.startChat({ history });
    const result = await sendMessageWithRetry(chat, lastMessage.parts);
    const response = await result.response;
    const assistantText = response.text();

    const responseData = { assistant: assistantText };

    // Cache the successful response
    setCachedResponse(messages, responseData);

    return res.status(200).json(responseData);
  } catch (err) {
    console.error('Gemini API error:', err);
    return res.status(500).json({ 
      message: 'An error occurred with the Gemini API.',
      error: err.message,
    });
  }
}

/**
 * Sends a message to the Gemini API with a retry mechanism for transient errors.
 */
async function sendMessageWithRetry(chat, message, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await chat.sendMessage(message);
    } catch (err) {
      // Check for 503 Service Unavailable or other retryable errors
      if (err.status === 503 && i < retries - 1) {
        console.log(`Attempt ${i + 1} failed with 503. Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw err; // Rethrow on non-retryable errors or last attempt
      }
    }
  }
}

module.exports = { chatController };