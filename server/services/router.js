const { config } = require('../config');
const openaiService = require('./openai');
const geminiService = require('./gemini');
const claudeService = require('./claude');
const deepseekService = require('./deepseek');
const openrouterService = require('./openrouter');
const ollamaService = require('./ollama');
const a1111Service = require('./automatic1111');
const comfyuiService = require('./comfyui');
const siliconflowImageService = require('./siliconflow-img');

const textProviders = {
  openai: openaiService,
  gemini: geminiService,
  claude: claudeService,
  deepseek: deepseekService,
  openrouter: openrouterService,
  ollama: ollamaService
};

const imageProviders = {
  automatic1111: a1111Service,
  comfyui: comfyuiService,
  siliconflow: siliconflowImageService
};

// Smart provider routing based on task type
const taskRouting = {
  'storytelling': ['gemini', 'claude', 'openrouter', 'openai', 'deepseek', 'ollama'],
  'prompt-engineering': ['openai', 'claude', 'openrouter', 'gemini', 'deepseek', 'ollama'],
  'script-generation': ['gemini', 'openai', 'claude', 'openrouter', 'deepseek', 'ollama'],
  'scene-planning': ['gemini', 'openai', 'claude', 'openrouter', 'deepseek', 'ollama'],
  'character-memory': ['claude', 'gemini', 'openrouter', 'openai', 'deepseek', 'ollama'],
  'consistency-analysis': ['openai', 'claude', 'openrouter', 'gemini', 'deepseek', 'ollama'],
  'general': ['openrouter', 'openai', 'gemini', 'claude', 'deepseek', 'ollama']
};

function getTextProvider(name) {
  const provider = textProviders[name];
  if (!provider) throw new Error(`Unknown text provider: ${name}`);
  return provider;
}

function getImageProvider(name) {
  const provider = imageProviders[name];
  if (!provider) throw new Error(`Unknown image provider: ${name}`);
  return provider;
}

// Get best available provider for a task
async function getAvailableProvider(taskType = 'general') {
  const order = taskRouting[taskType] || taskRouting['general'];

  for (const providerName of order) {
    const providerConfig = config[providerName];
    if (providerName === 'ollama' || providerConfig?.apiKey) {
      return providerName;
    }
  }
  throw new Error('No text AI provider configured. Please add an API key.');
}

// Get best available image provider
async function getAvailableImageProvider() {
  // 1. Try SiliconFlow Cloud first if API key is set (Premium Hardware Upgrade!)
  if (config.siliconflow.apiKey) {
    try {
      const sfHealth = await siliconflowImageService.healthCheck();
      if (sfHealth.status === 'online') return 'siliconflow';
    } catch (e) {
      console.warn('SiliconFlow cloud image provider health check failed:', e.message);
    }
  }

  // 2. Fall back to local AUTOMATIC1111
  try {
    const a1111Health = await a1111Service.healthCheck();
    if (a1111Health.status === 'online') return 'automatic1111';
  } catch (e) {}

  // 3. Fall back to local ComfyUI
  try {
    const comfyHealth = await comfyuiService.healthCheck();
    if (comfyHealth.status === 'online') return 'comfyui';
  } catch (e) {}

  throw new Error('No image generation backend available. Start AUTOMATIC1111/ComfyUI or configure a SiliconFlow Cloud Key.');
}

// Generate with fallback
async function generateWithFallback(prompt, options = {}) {
  const preferredProvider = options.provider;
  let providers;

  if (preferredProvider) {
    const fallbacks = Object.keys(textProviders).filter(p => p !== preferredProvider);
    providers = [preferredProvider, ...fallbacks];
  } else {
    providers = await getProviderOrder(options.taskType);
  }

  let lastError = null;
  for (const providerName of providers) {
    try {
      const providerConfig = config[providerName];
      if (providerName !== 'ollama' && !providerConfig?.apiKey) continue;

      const service = getTextProvider(providerName);
      const result = await service.generate(prompt, options.model, options);
      return result;
    } catch (e) {
      lastError = e;
      console.warn(`Provider ${providerName} failed: ${e.message}, trying next...`);
    }
  }

  throw lastError || new Error('All providers failed');
}

async function getProviderOrder(taskType = 'general') {
  return taskRouting[taskType] || taskRouting['general'];
}

// Health check all providers
async function healthCheckAll() {
  const results = {};

  // Text providers
  for (const [name, service] of Object.entries(textProviders)) {
    try {
      if (name === 'ollama' || config[name]?.apiKey) {
        results[name] = await service.healthCheck();
      } else {
        results[name] = { status: 'unconfigured', provider: name };
      }
    } catch (e) {
      results[name] = { status: 'error', provider: name, error: e.message };
    }
  }

  // Image providers
  for (const [name, service] of Object.entries(imageProviders)) {
    try {
      results[name] = await service.healthCheck();
    } catch (e) {
      results[name] = { status: 'offline', provider: name, error: e.message };
    }
  }

  // Telegram health check
  try {
    const telegramService = require('./telegram');
    if (config.telegram.token) {
      results['telegram'] = await telegramService.healthCheck();
    } else {
      results['telegram'] = { status: 'unconfigured', provider: 'telegram' };
    }
  } catch (e) {
    results['telegram'] = { status: 'error', provider: 'telegram', error: e.message };
  }

  return results;
}

module.exports = {
  getTextProvider,
  getImageProvider,
  getAvailableProvider,
  getAvailableImageProvider,
  generateWithFallback,
  getProviderOrder,
  healthCheckAll,
  textProviders,
  imageProviders,
  taskRouting
};
