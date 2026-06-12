const WebSocket = require('ws');
const { config } = require('../config');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getUrl(endpoint) {
  return `${config.comfyui.url}${endpoint}`;
}

function getWsUrl() {
  const httpUrl = config.comfyui.url;
  const wsUrl = httpUrl.replace(/^http/, 'ws');
  return `${wsUrl}/ws?clientId=${crypto.randomUUID()}`;
}

// Default txt2img workflow template for ComfyUI
function buildTxt2ImgWorkflow(prompt, negativePrompt = '', options = {}) {
  const seed = options.seed ?? Math.floor(Math.random() * 1000000000);
  return {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "seed": seed,
        "steps": options.steps || config.comfyui.defaultSteps,
        "cfg": options.cfgScale || config.comfyui.defaultCfgScale,
        "sampler_name": options.sampler || "euler",
        "scheduler": options.scheduler || "normal",
        "denoise": 1,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      }
    },
    "4": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": {
        "ckpt_name": options.model || "v1-5-pruned-emaonly.safetensors"
      }
    },
    "5": {
      "class_type": "EmptyLatentImage",
      "inputs": {
        "width": options.width || config.comfyui.defaultWidth,
        "height": options.height || config.comfyui.defaultHeight,
        "batch_size": options.batchSize || 1
      }
    },
    "6": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": prompt,
        "clip": ["4", 1]
      }
    },
    "7": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": negativePrompt,
        "clip": ["4", 1]
      }
    },
    "8": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": ["3", 0],
        "vae": ["4", 2]
      }
    },
    "9": {
      "class_type": "SaveImage",
      "inputs": {
        "filename_prefix": "comfyui",
        "images": ["8", 0]
      }
    }
  };
}

async function queuePrompt(workflow, onProgress) {
  const clientId = crypto.randomUUID();

  // Queue the prompt
  const res = await fetch(getUrl('/prompt'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId })
  });

  if (!res.ok) throw new Error(`ComfyUI queue failed: ${res.status}`);
  const { prompt_id } = await res.json();

  // Listen for progress via WebSocket
  return new Promise((resolve, reject) => {
    const wsUrl = config.comfyui.url.replace(/^http/, 'ws') + `/ws?clientId=${clientId}`;
    const ws = new WebSocket(wsUrl);
    let completed = false;

    const timeout = setTimeout(() => {
      if (!completed) {
        ws.close();
        reject(new Error('ComfyUI generation timeout (5 min)'));
      }
    }, 300000);

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'progress' && onProgress) {
          onProgress({
            value: msg.data.value,
            max: msg.data.max,
            percent: Math.round((msg.data.value / msg.data.max) * 100)
          });
        }

        if (msg.type === 'executing' && msg.data.node === null) {
          completed = true;
          clearTimeout(timeout);
          ws.close();

          // Fetch the result
          const history = await getHistory(prompt_id);
          const images = await downloadOutputImages(history, prompt_id);
          resolve({ images, promptId: prompt_id, backend: 'comfyui' });
        }
      } catch (e) {
        // ignore parse errors
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`ComfyUI WebSocket error: ${err.message}`));
    });
  });
}

async function txt2img(prompt, negativePrompt = '', options = {}) {
  const workflow = buildTxt2ImgWorkflow(prompt, negativePrompt, options);
  return queuePrompt(workflow, options.onProgress);
}

async function getHistory(promptId) {
  const res = await fetch(getUrl(`/history/${promptId}`));
  if (!res.ok) throw new Error('Failed to get ComfyUI history');
  return res.json();
}

async function downloadOutputImages(history, promptId) {
  const savedImages = [];
  const outputs = history[promptId]?.outputs;
  if (!outputs) return savedImages;

  for (const nodeId of Object.keys(outputs)) {
    const nodeOutput = outputs[nodeId];
    if (nodeOutput.images) {
      for (const img of nodeOutput.images) {
        const imgRes = await fetch(getUrl(`/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type || 'output'}`));
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const filename = `comfy_${Date.now()}_${img.filename}`;
          const filePath = path.join(config.outputDir, filename);
          fs.writeFileSync(filePath, buffer);
          savedImages.push({
            filename,
            url: `/output/${filename}`,
            size: buffer.length,
            originalName: img.filename
          });
        }
      }
    }
  }
  return savedImages;
}

async function getModels() {
  const res = await fetch(getUrl('/object_info/CheckpointLoaderSimple'));
  if (!res.ok) throw new Error('Failed to get ComfyUI models');
  const data = await res.json();
  const ckpts = data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
  return ckpts.map(name => ({ title: name, name }));
}

async function getSamplers() {
  const res = await fetch(getUrl('/object_info/KSampler'));
  if (!res.ok) throw new Error('Failed to get ComfyUI samplers');
  const data = await res.json();
  const samplers = data.KSampler?.input?.required?.sampler_name?.[0] || [];
  const schedulers = data.KSampler?.input?.required?.scheduler?.[0] || [];
  return { samplers, schedulers };
}

async function getSystemStats() {
  const res = await fetch(getUrl('/system_stats'));
  if (!res.ok) throw new Error('Failed to get ComfyUI stats');
  return res.json();
}

async function interrupt() {
  const res = await fetch(getUrl('/interrupt'), { method: 'POST' });
  return res.ok;
}

async function healthCheck() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(getUrl('/system_stats'), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    return {
      status: 'online',
      provider: 'comfyui',
      devices: data.devices || [],
      url: config.comfyui.url
    };
  } catch (e) {
    return { status: 'offline', provider: 'comfyui', error: e.message, url: config.comfyui.url };
  }
}

module.exports = { txt2img, queuePrompt, getHistory, getModels, getSamplers, getSystemStats, interrupt, healthCheck, buildTxt2ImgWorkflow };
