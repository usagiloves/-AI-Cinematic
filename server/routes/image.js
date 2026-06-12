const express = require('express');
const router = express.Router();
const multer = require('multer');
const a1111 = require('../services/automatic1111');
const comfyui = require('../services/comfyui');
const providerRouter = require('../services/router');
const storage = require('../utils/storage');
const path = require('path');
const fs = require('fs');
const { config } = require('../config');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/image/txt2img
router.post('/txt2img', async (req, res) => {
  try {
    const { prompt, negativePrompt, backend, model, sampler, scheduler, steps, cfgScale, width, height, seed, batchSize } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    const broadcast = req.app.get('broadcast');
    const targetBackend = backend || await providerRouter.getAvailableImageProvider();

    broadcast('image:generating', { backend: targetBackend, prompt: prompt.substring(0, 100) });

    const options = { model, sampler, scheduler, steps, cfgScale, width, height, seed, batchSize };
    let result;

    if (targetBackend === 'automatic1111') {
      result = await a1111.txt2img(prompt, negativePrompt || '', options);
    } else if (targetBackend === 'comfyui') {
      result = await comfyui.txt2img(prompt, negativePrompt || '', {
        ...options,
        onProgress: (progress) => broadcast('image:progress', { backend: 'comfyui', ...progress })
      });
    } else {
      return res.status(400).json({ error: `Unknown backend: ${targetBackend}` });
    }

    // Save to history
    storage.appendToArray('image_history', {
      timestamp: Date.now(),
      prompt, negativePrompt,
      backend: targetBackend,
      images: result.images,
      parameters: options
    });

    broadcast('image:generated', { backend: targetBackend, images: result.images });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/image/img2img
router.post('/img2img', upload.single('image'), async (req, res) => {
  try {
    const { prompt, negativePrompt, backend, steps, cfgScale, width, height, seed, denoisingStrength } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    let imageBase64;
    if (req.file) {
      imageBase64 = req.file.buffer.toString('base64');
    } else if (req.body.image) {
      imageBase64 = req.body.image;
    } else {
      return res.status(400).json({ error: 'Image required' });
    }

    const targetBackend = backend || 'automatic1111';
    const broadcast = req.app.get('broadcast');
    broadcast('image:generating', { backend: targetBackend, type: 'img2img' });

    let result;
    if (targetBackend === 'automatic1111') {
      result = await a1111.img2img(imageBase64, prompt, negativePrompt || '', { steps, cfgScale, width, height, seed, denoisingStrength });
    } else {
      return res.status(400).json({ error: 'img2img currently only supported with AUTOMATIC1111' });
    }

    storage.appendToArray('image_history', {
      timestamp: Date.now(), prompt, negativePrompt, backend: targetBackend,
      images: result.images, type: 'img2img'
    });

    broadcast('image:generated', { backend: targetBackend, images: result.images });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/image/models
router.get('/models', async (req, res) => {
  try {
    const { backend } = req.query;
    const results = {};

    if (!backend || backend === 'automatic1111') {
      try { results.automatic1111 = await a1111.getModels(); } catch (e) { results.automatic1111 = []; }
    }
    if (!backend || backend === 'comfyui') {
      try { results.comfyui = await comfyui.getModels(); } catch (e) { results.comfyui = []; }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/image/samplers
router.get('/samplers', async (req, res) => {
  try {
    const results = {};
    try { results.automatic1111 = await a1111.getSamplers(); } catch (e) { results.automatic1111 = []; }
    try { results.comfyui = await comfyui.getSamplers(); } catch (e) { results.comfyui = { samplers: [], schedulers: [] }; }
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/image/progress
router.get('/progress', async (req, res) => {
  try {
    const progress = await a1111.getProgress();
    res.json(progress);
  } catch (error) {
    res.json({ progress: 0 });
  }
});

// POST /api/image/interrupt
router.post('/interrupt', async (req, res) => {
  try {
    const { backend } = req.body;
    if (backend === 'comfyui') {
      await comfyui.interrupt();
    } else {
      await a1111.interrupt();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/image/history
router.get('/history', (req, res) => {
  try {
    const history = storage.get('image_history') || [];
    const limit = parseInt(req.query.limit) || 50;
    res.json(history.slice(-limit).reverse());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/image/output/:filename
router.get('/output/:filename', (req, res) => {
  const filePath = path.join(config.outputDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

module.exports = router;
