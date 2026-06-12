const OpenAI = require('openai');
const { config } = require('../config');

let client = null;

function getClient() {
  const key = config.deepseek.apiKey;
  if (!key) throw new Error('DeepSeek API key not configured. Go to API Keys to add one.');
  
  const baseURL = config.deepseek.baseURL || 'https://api.deepseek.com';
  if (!client || client._apiKey !== key || client._baseURL !== baseURL) {
    client = new OpenAI({
      apiKey: key,
      baseURL: baseURL,
      timeout: 86400000 // 24 hours (Unlimited)
    });
    client._apiKey = key;
    client._baseURL = baseURL;
  }
  return client;
}

async function generate(prompt, model, options = {}) {
  const deepseek = getClient();
  const startTime = Date.now();

  const messages = options.messages || [{ role: 'user', content: prompt }];
  const response = await deepseek.chat.completions.create({
    model: model || config.deepseek.defaultModel,
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
    provider: 'deepseek',
    finishReason: choice.finish_reason
  };
}

async function* stream(prompt, model, options = {}) {
  const deepseek = getClient();
  const messages = options.messages || [{ role: 'user', content: prompt }];

  const stream = await deepseek.chat.completions.create({
    model: model || config.deepseek.defaultModel,
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
    const deepseek = getClient();
    // Use models.list or a very cheap query for health check
    await deepseek.models.list();
    return { status: 'online', provider: 'deepseek' };
  } catch (e) {
    return { status: 'offline', provider: 'deepseek', error: e.message };
  }
}

module.exports = { generate, stream, healthCheck };
