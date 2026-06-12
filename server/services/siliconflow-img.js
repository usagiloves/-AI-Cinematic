const { config } = require('../config');
const fs = require('fs');
const path = require('path');

/**
 * Text to Image generation via SiliconFlow Cloud
 */
async function txt2img(prompt, negativePrompt = '', options = {}) {
  const apiKey = config.siliconflow.apiKey;
  if (!apiKey) throw new Error('SiliconFlow API key not configured.');

  // SiliconFlow standard portrait sizes, typically 768x1024 or 768x1360 for Flux/SDXL
  let width = options.width || config.siliconflow.defaultWidth || 768;
  let height = options.height || config.siliconflow.defaultHeight || 1360;
  if (width === 768 && height === 1366) {
    height = 1360; // 768x1360 is perfectly optimized aspect ratio supported by SiliconFlow cloud
  }

  const payload = {
    model: options.model || config.siliconflow.defaultModel || 'stabilityai/stable-diffusion-xl-base-1.0',
    prompt: prompt,
    negative_prompt: negativePrompt || 'low quality, blurry, bad anatomy',
    image_size: `${width}x${height}`,
    batch_size: 1,
    seed: options.seed ? parseInt(options.seed) : Math.floor(Math.random() * 999999)
  };

  const response = await fetch('https://api.siliconflow.cn/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SiliconFlow Image Gen failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const savedImages = [];

  if (data.images && data.images.length > 0) {
    for (let i = 0; i < data.images.length; i++) {
      const imageUrl = data.images[i].url;
      const filename = `siliconflow_${Date.now()}_${i}.png`;
      const filePath = path.join(config.outputDir, filename);

      try {
        // Stream / Download the cloud image to local output directory to make it persistent!
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) throw new Error(`CDN download returned status ${imgRes.status}`);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        savedImages.push({
          filename,
          url: `/output/${filename}`,
          size: buffer.length
        });
      } catch (dlErr) {
        console.error(`[SiliconFlow CDN Download Failed] for url: ${imageUrl}`, dlErr.message);
        // Fallback: return the original cloud URL if downloading fails
        savedImages.push({
          filename: `cloud_${i}.png`,
          url: imageUrl,
          size: 0
        });
      }
    }
  }

  return {
    images: savedImages,
    parameters: payload,
    backend: 'siliconflow'
  };
}

/**
 * Health check connection
 */
async function healthCheck() {
  try {
    const apiKey = config.siliconflow.apiKey;
    if (!apiKey) throw new Error('No SiliconFlow API key configured');
    
    // Quick lightweight models query as a health check ping
    const res = await fetch('https://api.siliconflow.cn/v1/models?sub_type=text2img', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (res.ok) {
      return { status: 'online', provider: 'siliconflow' };
    }
    return { status: 'offline', provider: 'siliconflow', error: `HTTP ${res.status}` };
  } catch (e) {
    return { status: 'offline', provider: 'siliconflow', error: e.message };
  }
}

module.exports = { txt2img, healthCheck };
