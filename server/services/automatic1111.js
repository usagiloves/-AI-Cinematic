const { config } = require('../config');
const fs = require('fs');
const path = require('path');

function getUrl(endpoint) {
  return `${config.a1111.url}${endpoint}`;
}

async function txt2img(prompt, negativePrompt = '', options = {}) {
  const payload = {
    prompt: prompt,
    negative_prompt: negativePrompt,
    steps: options.steps || config.a1111.defaultSteps,
    cfg_scale: options.cfgScale || config.a1111.defaultCfgScale,
    width: options.width || config.a1111.defaultWidth,
    height: options.height || config.a1111.defaultHeight,
    sampler_name: options.sampler || config.a1111.defaultSampler,
    seed: options.seed ?? -1,
    batch_size: options.batchSize || 1,
    n_iter: options.nIter || 1,
    ...(options.overrideSettings ? { override_settings: options.overrideSettings } : {})
  };

  const res = await fetch(getUrl('/sdapi/v1/txt2img'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`A1111 txt2img failed: ${res.status} ${res.statusText}`);
  const data = await res.json();

  // Save images to output dir
  const savedImages = [];
  if (data.images) {
    for (let i = 0; i < data.images.length; i++) {
      const filename = `a1111_${Date.now()}_${i}.png`;
      const filePath = path.join(config.outputDir, filename);
      const buffer = Buffer.from(data.images[i], 'base64');
      fs.writeFileSync(filePath, buffer);
      savedImages.push({
        filename,
        url: `/output/${filename}`,
        size: buffer.length
      });
    }
  }

  return {
    images: savedImages,
    parameters: data.parameters || payload,
    info: data.info ? JSON.parse(data.info) : {},
    backend: 'automatic1111'
  };
}

async function img2img(imageBase64, prompt, negativePrompt = '', options = {}) {
  const payload = {
    init_images: [imageBase64],
    prompt: prompt,
    negative_prompt: negativePrompt,
    steps: options.steps || config.a1111.defaultSteps,
    cfg_scale: options.cfgScale || config.a1111.defaultCfgScale,
    width: options.width || config.a1111.defaultWidth,
    height: options.height || config.a1111.defaultHeight,
    sampler_name: options.sampler || config.a1111.defaultSampler,
    denoising_strength: options.denoisingStrength || 0.75,
    seed: options.seed ?? -1
  };

  const res = await fetch(getUrl('/sdapi/v1/img2img'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`A1111 img2img failed: ${res.status}`);
  const data = await res.json();

  const savedImages = [];
  if (data.images) {
    for (let i = 0; i < data.images.length; i++) {
      const filename = `a1111_i2i_${Date.now()}_${i}.png`;
      const filePath = path.join(config.outputDir, filename);
      const buffer = Buffer.from(data.images[i], 'base64');
      fs.writeFileSync(filePath, buffer);
      savedImages.push({ filename, url: `/output/${filename}`, size: buffer.length });
    }
  }

  return { images: savedImages, parameters: data.parameters, info: data.info ? JSON.parse(data.info) : {}, backend: 'automatic1111' };
}

async function getModels() {
  const res = await fetch(getUrl('/sdapi/v1/sd-models'));
  if (!res.ok) throw new Error('Failed to get A1111 models');
  const models = await res.json();
  return models.map(m => ({ title: m.title, name: m.model_name, hash: m.hash }));
}

async function getSamplers() {
  const res = await fetch(getUrl('/sdapi/v1/samplers'));
  if (!res.ok) throw new Error('Failed to get A1111 samplers');
  return res.json();
}

async function getUpscalers() {
  const res = await fetch(getUrl('/sdapi/v1/upscalers'));
  if (!res.ok) throw new Error('Failed to get A1111 upscalers');
  return res.json();
}

async function getProgress() {
  const res = await fetch(getUrl('/sdapi/v1/progress'));
  if (!res.ok) return { progress: 0, eta: 0 };
  return res.json();
}

async function interrupt() {
  const res = await fetch(getUrl('/sdapi/v1/interrupt'), { method: 'POST' });
  return res.ok;
}

async function getOptions() {
  const res = await fetch(getUrl('/sdapi/v1/options'));
  if (!res.ok) throw new Error('Failed to get A1111 options');
  return res.json();
}

async function setModel(modelTitle) {
  const res = await fetch(getUrl('/sdapi/v1/options'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sd_model_checkpoint: modelTitle })
  });
  return res.ok;
}

async function healthCheck() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(getUrl('/sdapi/v1/options'), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    return {
      status: 'online',
      provider: 'automatic1111',
      currentModel: data.sd_model_checkpoint || 'unknown',
      url: config.a1111.url
    };
  } catch (e) {
    return { status: 'offline', provider: 'automatic1111', error: e.message, url: config.a1111.url };
  }
}

module.exports = { txt2img, img2img, getModels, getSamplers, getUpscalers, getProgress, interrupt, getOptions, setModel, healthCheck };
