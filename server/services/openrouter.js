const OpenAI = require('openai');
const { config } = require('../config');

let client = null;

function getClient() {
  const key = config.openrouter.apiKey;
  if (!key) throw new Error('OpenRouter API key not configured. Go to API Keys to add one.');
  
  const baseURL = config.openrouter.baseURL || 'https://openrouter.ai/api/v1';
  if (!client || client._apiKey !== key || client._baseURL !== baseURL) {
    client = new OpenAI({
      apiKey: key,
      baseURL: baseURL,
      timeout: 86400000, // Unlimited (24 hours)
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Cinematic OS'
      }
    });
    client._apiKey = key;
    client._baseURL = baseURL;
  }
  return client;
}

async function generate(prompt, model, options = {}) {
  const openrouter = getClient();
  const startTime = Date.now();

  const messages = options.messages || [{ role: 'user', content: prompt }];
  const targetModel = model || config.openrouter.defaultModel || 'google/gemini-2.5-flash';

  try {
    const response = await openrouter.chat.completions.create({
      model: targetModel,
      messages,
      temperature: options.temperature ?? 0.7,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {})
    });

    const latency = Date.now() - startTime;
    const choice = response.choices[0];

    return {
      content: choice.message.content,
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      },
      latency,
      provider: 'openrouter',
      finishReason: choice.finish_reason
    };
  } catch (err) {
    if (err.message && err.message.includes('can only afford')) {
      const match = err.message.match(/can only afford (\d+)/);
      if (match && match[1]) {
        const affordableTokens = parseInt(match[1]);
        console.warn(`[OpenRouter] Low credits: requested ${options.maxTokens || 32000} but can only afford ${affordableTokens}. Retrying with ${affordableTokens - 100} tokens.`);
        return generate(prompt, model, { ...options, maxTokens: Math.max(1000, affordableTokens - 100) });
      }
    }
    throw err;
  }
}

async function* stream(prompt, model, options = {}) {
  const openrouter = getClient();
  const messages = options.messages || [{ role: 'user', content: prompt }];
  const targetModel = model || config.openrouter.defaultModel || 'google/gemini-2.5-flash';

  let s;
  try {
    s = await openrouter.chat.completions.create({
      model: targetModel,
      messages,
      temperature: options.temperature ?? 0.7,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      stream: true
    });
  } catch (err) {
    if (err.message && err.message.includes('can only afford')) {
      const match = err.message.match(/can only afford (\d+)/);
      if (match && match[1]) {
        const affordableTokens = parseInt(match[1]);
        console.warn(`[OpenRouter] Low credits on stream: requested ${options.maxTokens || 32000} but can only afford ${affordableTokens}. Retrying with ${affordableTokens - 100} tokens.`);
        yield* stream(prompt, model, { ...options, maxTokens: Math.max(1000, affordableTokens - 100) });
        return;
      }
    }
    throw err;
  }

  for await (const chunk of s) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield { content, done: false };
    }
  }
  yield { content: '', done: true };
}

async function healthCheck() {
  try {
    const key = config.openrouter.apiKey;
    if (!key) throw new Error('No API key configured');
    
    const openrouter = getClient();
    // Use a lightweight model for quick health check
    const response = await openrouter.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 5
    });
    
    if (response && response.choices && response.choices.length > 0) {
      return { status: 'online', provider: 'openrouter' };
    }
    return { status: 'offline', provider: 'openrouter', error: 'No response choice received' };
  } catch (e) {
    return { status: 'offline', provider: 'openrouter', error: e.message };
  }
}

module.exports = { generate, stream, healthCheck };
