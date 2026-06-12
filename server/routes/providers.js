const express = require('express');
const router = express.Router();
const providerRouter = require('../services/router');
const { config, updateConfig } = require('../config');
const ollamaService = require('../services/ollama');

// GET /api/providers - List all providers with status
router.get('/', async (req, res) => {
  try {
    const ollamaModels = await ollamaService.getModels().catch(() => config.ollama.models);
    const providers = [
      {
        id: 'openai', name: 'OpenAI', type: 'text', icon: '🔗',
        configured: !!config.openai.apiKey,
        models: config.openai.models,
        defaultModel: config.openai.defaultModel
      },
      {
        id: 'gemini', name: 'Google Gemini', type: 'text', icon: '✨',
        configured: !!config.gemini.apiKey,
        models: config.gemini.models,
        defaultModel: config.gemini.defaultModel
      },
      {
        id: 'claude', name: 'Anthropic Claude', type: 'text', icon: '🧩',
        configured: !!config.claude.apiKey,
        models: config.claude.models,
        defaultModel: config.claude.defaultModel
      },
      {
        id: 'deepseek', name: 'DeepSeek', type: 'text', icon: '🐳',
        configured: !!config.deepseek.apiKey,
        models: config.deepseek.models,
        defaultModel: config.deepseek.defaultModel
      },
      {
        id: 'openrouter', name: 'OpenRouter', type: 'text', icon: '🌐',
        configured: !!config.openrouter.apiKey,
        models: config.openrouter.models,
        defaultModel: config.openrouter.defaultModel
      },
      {
        id: 'ollama', name: 'Ollama (Local LLMs)', type: 'text', icon: '🦙',
        configured: true,
        models: ollamaModels,
        defaultModel: config.ollama.defaultModel,
        url: config.ollama.url
      },
      {
        id: 'automatic1111', name: 'AUTOMATIC1111', type: 'image', icon: '🎨',
        configured: true,
        url: config.a1111.url
      },
      {
        id: 'comfyui', name: 'ComfyUI', type: 'image', icon: '🖼️',
        configured: true,
        url: config.comfyui.url
      }
    ];

    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/providers/:id/health - Health check
router.get('/:id/health', async (req, res) => {
  try {
    const { id } = req.params;
    const allHealth = await providerRouter.healthCheckAll();
    const health = allHealth[id];

    if (!health) return res.status(404).json({ error: `Provider ${id} not found` });
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/providers/health - Health check all
router.get('/health/all', async (req, res) => {
  try {
    const results = await providerRouter.healthCheckAll();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/providers/:id/config - Update provider config
router.put('/:id/config', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updateConfig(id, updates);
    res.json({ success: true, provider: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
