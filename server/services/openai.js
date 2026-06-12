const OpenAI = require('openai');
const { config } = require('../config');

let client = null;

function getClient() {
  const key = config.openai.apiKey;
  if (!key) throw new Error('OpenAI API key not configured');
  
  const baseURL = config.openai.baseURL || '';
  if (!client || client._apiKey !== key || client._baseURL !== baseURL) {
    const opts = { apiKey: key, timeout: 86400000 }; // 24 hours (Unlimited)
    if (baseURL) opts.baseURL = baseURL;
    client = new OpenAI(opts);
    client._apiKey = key;
    client._baseURL = baseURL;
  }
  return client;
}

async function generate(prompt, model, options = {}) {
  const openai = getClient();
  const startTime = Date.now();

  const messages = options.messages || [{ role: 'user', content: prompt }];
  const response = await openai.chat.completions.create({
    model: model || config.openai.defaultModel,
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
    provider: 'openai',
    finishReason: choice.finish_reason
  };
}

async function* stream(prompt, model, options = {}) {
  const openai = getClient();
  const messages = options.messages || [{ role: 'user', content: prompt }];

  const stream = await openai.chat.completions.create({
    model: model || config.openai.defaultModel,
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
    const openai = getClient();
    await openai.models.list();
    return { status: 'online', provider: 'openai' };
  } catch (e) {
    return { status: 'offline', provider: 'openai', error: e.message };
  }
}

module.exports = { generate, stream, healthCheck };
