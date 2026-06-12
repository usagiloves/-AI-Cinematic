const express = require('express');
const router = express.Router();
const { config } = require('../config');
const storage = require('../utils/storage');
const path = require('path');
const fs = require('fs');

const keysFile = path.join(config.dataDir, 'keys.json');

function loadKeys() {
  try {
    if (fs.existsSync(keysFile)) return JSON.parse(fs.readFileSync(keysFile, 'utf8'));
  } catch (e) {}
  return {};
}

function saveKeys(keys) {
  fs.writeFileSync(keysFile, JSON.stringify(keys, null, 2));
}

function maskKey(key) {
  if (!key || key.length < 8) return key ? '****' : '';
  return key.substring(0, 4) + '****' + key.substring(key.length - 4);
}

// POST /api/keys - Save API key
router.post('/', (req, res) => {
  try {
    const { provider, key, url } = req.body;
    if (!provider) return res.status(400).json({ error: 'Provider required' });

    const keys = loadKeys();

    if (key !== undefined) {
      keys[provider] = key;
      // Update runtime config
      if (config[provider]) config[provider].apiKey = key;
      if (provider === 'telegramToken') {
        config.telegram.token = key;
        config.telegram.enabled = !!key;
        try {
          const telegramService = require('../services/telegram');
          if (key) {
            telegramService.startPolling();
          } else {
            telegramService.stopPolling();
          }
        } catch (e) {
          console.error('Error toggling Telegram polling on key save:', e.message);
        }
      }
      if (provider === 'telegramChatIds') {
        config.telegram.chatIds = key ? key.split(',') : [];
      }
      if (provider === 'telegramWhitelist') {
        config.telegram.whitelist = key ? key.split(',') : [];
      }
      if (provider === 'telegramAdminIds') {
        config.telegram.adminIds = key ? key.split(',') : [];
      }
    }

    if (url !== undefined) {
      keys[`${provider}Url`] = url;
      if (provider === 'a1111' || provider === 'automatic1111') config.a1111.url = url;
      if (provider === 'comfyui') config.comfyui.url = url;
      if (provider === 'openai') config.openai.baseURL = url;
      if (provider === 'deepseek') config.deepseek.baseURL = url;
      if (provider === 'ollama') config.ollama.url = url;
    }

    saveKeys(keys);

    const broadcast = req.app.get('broadcast');
    broadcast('keys:updated', { provider });

    res.json({ success: true, provider, masked: key ? maskKey(key) : undefined });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/keys - List configured keys (masked)
router.get('/', (req, res) => {
  try {
    const keys = loadKeys();
    const masked = {};
    for (const [k, v] of Object.entries(keys)) {
      if (k.endsWith('Url')) {
        masked[k] = v;
      } else {
        masked[k] = maskKey(v);
      }
    }

    // Also include env-based keys
    const result = {
      openai: masked.openai || maskKey(config.openai.apiKey),
      openaiUrl: masked.openaiUrl || config.openai.baseURL || '',
      gemini: masked.gemini || maskKey(config.gemini.apiKey),
      claude: masked.claude || maskKey(config.claude.apiKey),
      deepseek: masked.deepseek || maskKey(config.deepseek.apiKey),
      deepseekUrl: masked.deepseekUrl || config.deepseek.baseURL || '',
      openrouter: masked.openrouter || maskKey(config.openrouter.apiKey),
      ollamaUrl: masked.ollamaUrl || config.ollama.url || 'http://localhost:11434',
      a1111Url: masked.a1111Url || config.a1111.url,
      comfyuiUrl: masked.comfyuiUrl || config.comfyui.url,
      telegramToken: keys.telegramToken ? maskKey(keys.telegramToken) : (config.telegram.token ? maskKey(config.telegram.token) : ''),
      telegramChatIds: keys.telegramChatIds || config.telegram.chatIds.join(','),
      telegramWhitelist: keys.telegramWhitelist || config.telegram.whitelist.join(','),
      telegramAdminIds: keys.telegramAdminIds || config.telegram.adminIds.join(','),
      siliconflow: masked.siliconflow || maskKey(config.siliconflow.apiKey),
      configured: {
        openai: !!config.openai.apiKey,
        gemini: !!config.gemini.apiKey,
        claude: !!config.claude.apiKey,
        deepseek: !!config.deepseek.apiKey,
        openrouter: !!config.openrouter.apiKey,
        telegram: !!config.telegram.token,
        siliconflow: !!config.siliconflow.apiKey
      }
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/keys/:provider - Remove key
router.delete('/:provider', (req, res) => {
  try {
    const { provider } = req.params;
    const keys = loadKeys();
    delete keys[provider];
    saveKeys(keys);

    if (config[provider]) config[provider].apiKey = '';
     if (provider === 'telegramToken') {
      config.telegram.token = '';
      config.telegram.enabled = false;
      try {
        require('../services/telegram').stopPolling();
      } catch (e) {
        console.error('Error stopping Telegram polling on key delete:', e.message);
      }
    }

    res.json({ success: true, provider });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
