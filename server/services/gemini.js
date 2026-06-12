const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config');

let client = null;
let cachedKey = '';

function getClient() {
  const key = config.gemini.apiKey;
  if (!key) throw new Error('Gemini API key not configured');
  if (!client || cachedKey !== key) {
    client = new GoogleGenerativeAI(key);
    cachedKey = key;
  }
  return client;
}

async function generate(prompt, model, options = {}) {
  const genAI = getClient();
  const startTime = Date.now();

  const modelName = model || config.gemini.defaultModel;
  const genModel = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : { maxOutputTokens: 8192 })
    }
  });

  let result;
  if (options.messages && options.messages.length > 1) {
    // Chat mode
    const history = options.messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    const lastMsg = options.messages[options.messages.length - 1];
    const chat = genModel.startChat({ history });
    result = await chat.sendMessage(lastMsg.content);
  } else {
    result = await genModel.generateContent(prompt);
  }

  const latency = Date.now() - startTime;
  const response = result.response;
  const text = response.text();
  const usage = response.usageMetadata || {};

  return {
    content: text,
    model: modelName,
    usage: {
      promptTokens: usage.promptTokenCount || 0,
      completionTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0
    },
    latency,
    provider: 'gemini',
    finishReason: 'stop'
  };
}

async function* stream(prompt, model, options = {}) {
  const genAI = getClient();
  const modelName = model || config.gemini.defaultModel;
  const genModel = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : { maxOutputTokens: 8192 })
    }
  });

  const result = await genModel.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield { content: text, done: false };
    }
  }
  yield { content: '', done: true };
}

async function healthCheck() {
  try {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({ model: config.gemini.defaultModel });
    await model.generateContent('ping');
    return { status: 'online', provider: 'gemini' };
  } catch (e) {
    return { status: 'offline', provider: 'gemini', error: e.message };
  }
}

module.exports = { generate, stream, healthCheck };
