const Anthropic = require('@anthropic-ai/sdk');
const { config } = require('../config');

let client = null;
let cachedKey = '';

function getClient() {
  const key = config.claude.apiKey;
  if (!key) throw new Error('Claude API key not configured. Go to API Keys to add one.');
  if (!client || cachedKey !== key) {
    client = new Anthropic({ apiKey: key, timeout: 86400000 }); // 24 hours (Unlimited)
    cachedKey = key;
  }
  return client;
}

async function generate(prompt, model, options = {}) {
  const anthropic = getClient();
  const startTime = Date.now();

  const messages = options.messages || [{ role: 'user', content: prompt }];
  // Filter system messages for Anthropic
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  // Ensure messages alternate correctly
  const cleanedMessages = [];
  let lastRole = null;
  for (const msg of chatMessages) {
    if (msg.role === lastRole) {
      // Merge consecutive same-role messages
      cleanedMessages[cleanedMessages.length - 1].content += '\n' + msg.content;
    } else {
      cleanedMessages.push(msg);
      lastRole = msg.role;
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: model || config.claude.defaultModel,
      max_tokens: Math.min(options.maxTokens || 8192, 8192),
      messages: cleanedMessages,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      temperature: options.temperature ?? 0.7
    });

    const latency = Date.now() - startTime;
    const text = response.content.map(c => c.text).join('');

    return {
      content: text,
      model: response.model,
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
      },
      latency,
      provider: 'claude',
      finishReason: response.stop_reason
    };
  } catch (e) {
    // Classify errors for better UX
    if (e.status === 401) {
      throw new Error('Claude API key is invalid. Please check your key in API Keys settings.');
    }
    if (e.status === 429) {
      throw new Error('Claude rate limit exceeded. Please wait a moment and try again.');
    }
    if (e.status === 529) {
      throw new Error('Claude API is overloaded. Please try again in a few seconds.');
    }
    if (e.message?.includes('ECONNREFUSED') || e.message?.includes('ENOTFOUND')) {
      throw new Error('Cannot connect to Claude API. Check your network connection.');
    }
    throw e;
  }
}

async function* stream(prompt, model, options = {}) {
  const anthropic = getClient();
  const messages = options.messages || [{ role: 'user', content: prompt }];
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  // Clean consecutive same-role messages
  const cleanedMessages = [];
  let lastRole = null;
  for (const msg of chatMessages) {
    if (msg.role === lastRole) {
      cleanedMessages[cleanedMessages.length - 1].content += '\n' + msg.content;
    } else {
      cleanedMessages.push(msg);
      lastRole = msg.role;
    }
  }

  try {
    const stream = anthropic.messages.stream({
      model: model || config.claude.defaultModel,
      max_tokens: Math.min(options.maxTokens || 8192, 8192),
      messages: cleanedMessages,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      temperature: options.temperature ?? 0.7
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        yield { content: event.delta.text, done: false };
      }
    }
    yield { content: '', done: true };
  } catch (e) {
    if (e.status === 429) {
      yield { content: '\n\n⚠️ Rate limited. Please wait and retry.', done: true, error: true };
    } else {
      throw e;
    }
  }
}

async function healthCheck() {
  try {
    if (!config.claude.apiKey) throw new Error('No API key');
    const anthropic = getClient();
    await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ping' }]
    });
    return { status: 'online', provider: 'claude' };
  } catch (e) {
    return { status: 'offline', provider: 'claude', error: e.message };
  }
}

module.exports = { generate, stream, healthCheck };
