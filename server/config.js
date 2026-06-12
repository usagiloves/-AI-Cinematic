const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Load saved keys from data/keys.json if exists
let savedKeys = {};
const keysFile = path.join(dataDir, 'keys.json');
if (fs.existsSync(keysFile)) {
  try {
    savedKeys = JSON.parse(fs.readFileSync(keysFile, 'utf8'));
  } catch (e) {
    savedKeys = {};
  }
}

const config = {
  port: process.env.PORT || 3000,

  openai: {
    apiKey: savedKeys.openai || process.env.OPENAI_API_KEY || '',
    baseURL: savedKeys.openaiUrl || process.env.OPENAI_BASE_URL || '',
    models: [
      'gpt-4o', 'gpt-4.1', 'gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-oss-20b',
      'google/gemini-2.5-pro', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-405b-instruct', 'deepseek/deepseek-chat', 'deepseek/deepseek-v4-flash'
    ],
    defaultModel: 'gpt-4o'
  },

  gemini: {
    apiKey: savedKeys.gemini || process.env.GEMINI_API_KEY || '',
    models: ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    defaultModel: 'gemini-2.0-flash'
  },

  claude: {
    apiKey: savedKeys.claude || process.env.CLAUDE_API_KEY || '',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    defaultModel: 'claude-sonnet-4-20250514'
  },

  deepseek: {
    apiKey: savedKeys.deepseek || process.env.DEEPSEEK_API_KEY || '',
    baseURL: savedKeys.deepseekUrl || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-v4-flash'],
    defaultModel: 'deepseek-v4-flash'
  },

  openrouter: {
    apiKey: savedKeys.openrouter || process.env.OPENROUTER_API_KEY || '',
    baseURL: 'https://openrouter.ai/api/v1',
    models: [
      'google/gemini-2.5-flash', 'deepseek/deepseek-chat', 'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3.1-405b-instruct', 'google/gemini-2.5-pro', 'qwen/qwen-2.5-72b-instruct'
    ],
    defaultModel: 'google/gemini-2.5-flash'
  },

  ollama: {
    url: savedKeys.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434',
    models: ['qwen3.6:latest', 'llama3', 'mistral', 'phi3', 'qwen2'],
    defaultModel: 'qwen3.6:latest'
  },

  a1111: {
    url: savedKeys.a1111Url || process.env.A1111_URL || 'http://localhost:7860',
    defaultSampler: 'Euler a',
    defaultSteps: 20,
    defaultCfgScale: 7,
    defaultWidth: 768,
    defaultHeight: 1366
  },

  comfyui: {
    url: savedKeys.comfyuiUrl || process.env.COMFYUI_URL || 'http://localhost:8188',
    defaultSteps: 20,
    defaultCfgScale: 7,
    defaultWidth: 768,
    defaultHeight: 1366
  },

  telegram: {
    token: savedKeys.telegramToken || process.env.TELEGRAM_BOT_TOKEN || '',
    chatIds: savedKeys.telegramChatIds ? savedKeys.telegramChatIds.split(',') : [],
    whitelist: savedKeys.telegramWhitelist ? savedKeys.telegramWhitelist.split(',') : [],
    adminIds: savedKeys.telegramAdminIds ? savedKeys.telegramAdminIds.split(',') : [],
    enabled: !!(savedKeys.telegramToken || process.env.TELEGRAM_BOT_TOKEN)
  },

  siliconflow: {
    apiKey: savedKeys.siliconflow || process.env.SILICONFLOW_API_KEY || '',
    baseURL: 'https://api.siliconflow.cn/v1',
    defaultModel: 'stabilityai/stable-diffusion-xl-base-1.0',
    models: [
      'stabilityai/stable-diffusion-xl-base-1.0',
      'black-forest-labs/FLUX.1-schnell',
      'stabilityai/stable-diffusion-3-5-large-turbo'
    ]
  },

  dataDir,
  outputDir: path.join(__dirname, '..', 'output')
};

// Ensure output dir
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

function updateConfig(provider, updates) {
  if (config[provider]) {
    Object.assign(config[provider], updates);
  }
}

module.exports = { config, updateConfig };
