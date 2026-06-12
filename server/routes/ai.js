const express = require('express');
const router = express.Router();
const providerRouter = require('../services/router');
const tokenTracker = require('../utils/token-tracker');

// POST /api/ai/generate - Generate text with selected provider
router.post('/generate', async (req, res) => {
  try {
    const { prompt, provider, model, taskType, temperature, maxTokens, jsonMode, messages } = req.body;
    if (!prompt && !messages) return res.status(400).json({ error: 'Prompt or messages required' });

    const broadcast = req.app.get('broadcast');
    broadcast('ai:generating', { provider, model, taskType });

    let result;
    if (provider) {
      const service = providerRouter.getTextProvider(provider);
      result = await service.generate(prompt, model, { temperature, maxTokens, jsonMode, messages });
    } else {
      result = await providerRouter.generateWithFallback(prompt, { model, taskType, temperature, maxTokens, jsonMode, messages });
    }

    tokenTracker.track(result);
    broadcast('ai:generated', { provider: result.provider, model: result.model, tokens: result.usage.totalTokens, latency: result.latency });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/chat - Chat completion
router.post('/chat', async (req, res) => {
  try {
    const { messages, provider, model, temperature, maxTokens } = req.body;
    if (!messages || !messages.length) return res.status(400).json({ error: 'Messages required' });

    let result;
    if (provider) {
      const service = providerRouter.getTextProvider(provider);
      result = await service.generate(messages[messages.length - 1].content, model, {
        messages, temperature, maxTokens
      });
    } else {
      result = await providerRouter.generateWithFallback(messages[messages.length - 1].content, {
        model, messages, temperature, maxTokens
      });
    }

    tokenTracker.track(result);

    const broadcast = req.app.get('broadcast');
    broadcast('ai:generated', { provider: result.provider, tokens: result.usage.totalTokens });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/stream - SSE streaming
router.get('/stream', async (req, res) => {
  const { prompt, provider, model } = req.query;
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  try {
    const targetProvider = provider || await providerRouter.getAvailableProvider();
    const service = providerRouter.getTextProvider(targetProvider);
    const gen = service.stream(prompt, model);

    for await (const chunk of gen) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
  }
  res.end();
});

module.exports = router;
