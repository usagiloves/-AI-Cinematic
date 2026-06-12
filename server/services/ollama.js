const OpenAI = require('openai');
const { config } = require('../config');

let client = null;

function getClient() {
  const url = config.ollama.url || 'http://localhost:11434';
  const baseURL = `${url.replace(/\/$/, '')}/v1`;
  
  if (!client || client._baseURL !== baseURL) {
    client = new OpenAI({
      apiKey: 'ollama',
      baseURL: baseURL,
      timeout: 86400000 // 24 hours (Unlimited)
    });
    client._baseURL = baseURL;
  }
  return client;
}

let cachedModels = null;
let lastModelsFetch = 0;
const CACHE_TTL = 30000; // 30 seconds cache TTL

async function getModels() {
  const now = Date.now();
  if (cachedModels && (now - lastModelsFetch < CACHE_TTL)) {
    return cachedModels;
  }

  try {
    const url = config.ollama.url || 'http://localhost:11434';
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${url.replace(/\/$/, '')}/api/tags`, { signal: controller.signal });
    clearTimeout(id);
    
    if (!response.ok) return cachedModels || config.ollama.models;
    const data = await response.json();
    if (data.models && Array.isArray(data.models)) {
      const names = data.models.map(m => m.name);
      if (names.length > 0) {
        cachedModels = names;
        lastModelsFetch = now;
        return names;
      }
    }
  } catch (e) {}
  return cachedModels || config.ollama.models;
}

async function generate(prompt, model, options = {}) {
  const ollama = getClient();
  const startTime = Date.now();

  const messages = options.messages || [{ role: 'user', content: prompt }];
  
  // Fetch actual model names to use default if none selected
  const availableModels = await getModels();
  const targetModel = model || config.ollama.defaultModel || availableModels[0] || 'llama3';

  const response = await ollama.chat.completions.create({
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
    provider: 'ollama',
    finishReason: choice.finish_reason
  };
}

async function* stream(prompt, model, options = {}) {
  const ollama = getClient();
  const messages = options.messages || [{ role: 'user', content: prompt }];

  const availableModels = await getModels();
  const targetModel = model || config.ollama.defaultModel || availableModels[0] || 'llama3';

  const stream = await ollama.chat.completions.create({
    model: targetModel,
    messages,
    temperature: options.temperature ?? 0.7,
    ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    stream: true
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield { content, done: false };
    }
  }
  yield { content: '', done: true };
}

async function healthCheck() {
  try {
    const url = config.ollama.url || 'http://localhost:11434';
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${url.replace(/\/$/, '')}/api/tags`, { signal: controller.signal });
    clearTimeout(id);
    
    if (response.ok) {
      return { status: 'online', provider: 'ollama' };
    }
    return { status: 'offline', provider: 'ollama', error: `Server returned status: ${response.status}` };
  } catch (e) {
    return { status: 'offline', provider: 'ollama', error: e.message };
  }
}

module.exports = { generate, stream, healthCheck, getModels };
