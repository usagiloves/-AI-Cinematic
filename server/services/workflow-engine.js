const crypto = require('crypto');
const path = require('path');
const router = require('./router');
const { config } = require('../config');

// Active workflows
const workflows = new Map();

// ── Per-step idle timeout (no token received for this long → abort) ──
const STEP_IDLE_TIMEOUT = 300000; // 5 min
// ── Keepalive ping interval during streaming ──
const KEEPALIVE_INTERVAL = 15000; // 15 seconds

const workflowTemplates = {
  'anime-script': {
    id: 'anime-script',
    name: '🎬 Anime Script Generator',
    description: 'Tạo script anime từ ý tưởng: story → scenes → prompts',
    steps: [
      {
        id: 'story',
        name: 'Story Generation',
        type: 'text',
        taskType: 'storytelling',
        prompt: (input) => `You are an expert anime director, legendary screenwriter, and world-class storyteller. Create a highly detailed, deeply fleshed-out, and expansive anime story and cinematic screenplay blueprint from this idea:

"${input}"

Include:
1. Title (artistic, poetic, and memorable)
2. World-building & Atmosphere (comprehensive description of the setting, cultural rules, ambient tone, and aesthetic vibes)
3. Extended Character Sheets (for all main and supporting characters, detailing their visual descriptions, complex motivations, psychological traits, and key relationships)
4. Full Plot Outline (break down the narrative arc with high emotional resonance)
5. A sequence of fully developed cinematic scenes (create as many scenes as naturally required to tell the full story beautifully, without arbitrary constraints. For each scene, provide highly descriptive setting details, exact character actions, rich emotional shifts, camera movements, and director notes).

Write extensively without any length constraints. Deliver the ultimate creative masterpiece.`,
        options: {}
      },
      {
        id: 'prompts',
        name: 'Cinematic Prompt Engineering',
        type: 'text',
        taskType: 'prompt-engineering',
        prompt: (input, prevResults) => `You are a master of text-to-image prompt engineering, specialized in cinematic anime art styles (inspired by Makoto Shinkai, Kyoto Animation, and Studio Ghibli). Based on this deeply developed story:

${prevResults.story}

Create highly detailed, jaw-dropping image generation prompts for each and every cinematic scene described in the story. 

For each prompt, you must meticulously build a complex prompt structure including:
- Core subject: characters (appearance, expressions, exact clothing details)
- Precise environment: setting, background elements, flora/fauna, architecture
- Art style: specific anime render style, line-art details, brush strokes, shading style
- Cinematic elements: dramatic lighting (e.g., golden hour light rays, volumetric neon glow, dramatic rim light), camera lens (e.g., 35mm lens, depth of field, anamorphic flare), camera angle (e.g., low-angle hero shot, wide dynamic vista)
- Quality modifiers: masterpieces tags, rich textures, high-fidelity details
- Negative prompts: specific elements to avoid (e.g., low quality, anatomical errors, signature, text)

Format the output strictly as a JSON array containing objects for each scene:
[
  {
    "scene_number": 1,
    "title": "Scene Title",
    "positive_prompt": "masterpiece, highly detailed, raw photo, ...",
    "negative_prompt": "bad anatomy, low quality, ...",
    "recommended_settings": {
      "steps": 28,
      "cfg_scale": 7.5,
      "width": 768,
      "height": 1366
    }
  }
]`,
        options: {}
      },
      {
        id: 'generate',
        name: 'Image Generation',
        type: 'image',
        prompt: (input, prevResults) => {
          try {
            const prompts = JSON.parse(prevResults.prompts);
            return Array.isArray(prompts) ? prompts : [prompts];
          } catch (e) {
            console.warn('[Workflow Engine] Storyboard JSON parsing failed, attempting regex extraction:', e.message);
            // Robust regex fallback to extract individual scene prompts if JSON is truncated or broken
            const positiveRegex = /"positive_prompt"\s*:\s*"([^"]+)"/g;
            const prompts = [];
            let match;
            
            while ((match = positiveRegex.exec(prevResults.prompts)) !== null) {
              prompts.push({
                positive_prompt: match[1],
                negative_prompt: 'low quality, blurry, bad anatomy',
                recommended_settings: { width: 768, height: 1360 }
              });
            }
            
            if (prompts.length > 0) {
              console.log(`[Workflow Engine] Successfully recovered ${prompts.length} scene prompts via regex!`);
              return prompts;
            }
            
            return { positive_prompt: prevResults.prompts, negative_prompt: 'low quality' };
          }
        }
      }
    ]
  },
  'storyboard': {
    id: 'storyboard',
    name: '📋 Auto Storyboard',
    description: 'Chia storyboard tự động từ mô tả scene',
    steps: [
      {
        id: 'planning',
        name: 'Scene Planning',
        type: 'text',
        taskType: 'scene-planning',
        prompt: (input) => `You are a professional anime storyboard director. Break this scene into a highly detailed and extensive cinematic storyboard:

"${input}"

Create 5-8 detailed panels. For each panel, provide:
- panel_number: sequential number
- shot_type: e.g., extreme close-up, high-angle wide, dynamic medium shot
- camera_angle: e.g., dutch angle, low-angle tilt, overhead tracking
- camera_movement: e.g., pan, dolly zoom, crane shot, static
- action_description: extremely detailed movement and physical interactions
- dialog_or_sound: sound design notes, environmental background noises, or character lines
- emotion_and_expression: exact facial details, eyes focus, body language
- lighting_mood: detailed lighting style (volumetric rays, strong shadows, warm glow)

Format as a detailed JSON array. Do not constrain the length or depth of each description.`,
        options: {}
      },
      {
        id: 'prompts',
        name: 'Panel Prompt Generation',
        type: 'text',
        taskType: 'prompt-engineering',
        prompt: (input, prev) => `You are an expert anime storyboard prompt designer. Convert these storyboard planning panels into highly evocative, professional Stable Diffusion prompts:

${prev.planning}

For each panel, create a complete illustration blueprint containing:
- positive_prompt: masterpiece, highly detailed, exact character visual details, shot type, cinematic lighting, style tags (e.g., retro 90s anime, modern hyper-detailed KyoAni, hand-drawn Ghibli texture)
- negative_prompt: detailed negative tags
- recommended_width: recommended pixel width (e.g., 768)
- recommended_height: recommended pixel height (e.g., 1366)

Format strictly as a JSON array containing objects for each panel. Make the prompts incredibly vivid and descriptive without any shortcuts.`,
        options: {}
      }
    ]
  },
  'cinematic-prompt': {
    id: 'cinematic-prompt',
    name: '✨ Cinematic Prompt Enhancer',
    description: 'Nâng cấp prompt đơn giản thành cinematic prompt chuyên nghiệp',
    steps: [
      {
        id: 'enhance',
        name: 'Prompt Enhancement',
        type: 'text',
        taskType: 'prompt-engineering',
        prompt: (input) => `You are a legendary Stable Diffusion prompt engineer for cinematic anime art. Enhance this basic prompt into an absolute masterpiece:

Basic prompt: "${input}"

Provide:
1. Masterpiece Positive Prompt (incredibly vivid, descriptive, covering core subject, complex clothing, highly detailed background, time of day, volumetric atmospheric effects, film grain, and rich illustration style modifiers)
2. Professional Negative Prompt (extremely detailed, eliminating generic flaws, text, artifacts, bad hands)
3. Recommended settings (optimal steps, cfg_scale, sampler, width, height for SDXL/SD1.5)
4. 3 distinct artistic style variations (e.g., Neo-noir Cyberpunk anime, nostalgic 80s vaporwave cell, high-end fantasy watercolor) with exact prompt segments.

Format as a rich, beautiful, and deeply detailed JSON response. Do not limit the length or quality of your response.`,
        options: {}
      }
    ]
  }
};

async function executeWorkflow(templateId, input, broadcast) {
  const template = workflowTemplates[templateId];
  if (!template) throw new Error(`Unknown workflow template: ${templateId}`);

  const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const workflow = {
    id: workflowId,
    templateId,
    status: 'running',
    input,
    steps: template.steps.map(s => ({ ...s, status: 'pending', result: null })),
    results: {},
    startTime: Date.now(),
    endTime: null
  };

  workflows.set(workflowId, workflow);

  broadcast('workflow:start', { id: workflowId, templateId, name: template.name });

  try {
    const telegramService = require('./telegram');
    telegramService.broadcast(`⏳ <b>Bắt đầu xử lý Workflow:</b> <u>${template.name}</u> (Task ID: <code>${workflowId}</code>)\n💡 <b>Ý tưởng:</b> "${input.substring(0, 100)}${input.length > 100 ? '...' : ''}"`);
  } catch (err) {}

  try {
    for (let i = 0; i < template.steps.length; i++) {
      const step = template.steps[i];
      workflow.steps[i].status = 'running';
      broadcast('workflow:step', { id: workflowId, stepIndex: i, step: step.name, status: 'running' });

      try {
        const telegramService = require('./telegram');
        telegramService.broadcast(`🎬 <b>[Bước ${i + 1}/${template.steps.length}]:</b> Đang chạy bước <u>${step.name}</u>... ⏳`);
      } catch (err) {}

      const promptText = step.prompt(input, workflow.results);

      if (step.type === 'text') {
        const providers = await router.getProviderOrder(step.taskType);
        let success = false;
        let lastError = null;
        let accumulatedContent = '';

        for (const providerName of providers) {
          const providerConfig = config[providerName];
          if (providerName !== 'ollama' && !providerConfig?.apiKey) continue;

          try {
            const service = router.getTextProvider(providerName);
            const gen = service.stream(
              typeof promptText === 'string' ? promptText : JSON.stringify(promptText),
              step.options?.model,
              { jsonMode: step.options?.jsonMode, maxTokens: step.options?.maxTokens || 32000 }
            );

            accumulatedContent = '';
            let lastTokenTime = Date.now();

            // Keepalive ping interval — sends heartbeat every 15s to keep connections alive
            const keepaliveTimer = setInterval(() => {
              broadcast('workflow:step:keepalive', {
                id: workflowId,
                stepIndex: i,
                elapsed: Math.round((Date.now() - workflow.startTime) / 1000)
              });
            }, KEEPALIVE_INTERVAL);

            try {
              for await (const chunk of gen) {
                if (chunk.content) {
                  accumulatedContent += chunk.content;
                  lastTokenTime = Date.now();
                  broadcast('workflow:step:progress', {
                    id: workflowId,
                    stepIndex: i,
                    content: accumulatedContent
                  });
                }
              }
            } finally {
              clearInterval(keepaliveTimer);
            }

            if (!accumulatedContent || accumulatedContent.trim() === '') {
              throw new Error('AI provider returned empty content (possibly due to silent connection drop or model loading hang)');
            }

            success = true;
            workflow.results[step.id] = accumulatedContent;
            workflow.steps[i].result = {
              content: accumulatedContent,
              model: step.options?.model || config[providerName].defaultModel,
              usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
              latency: 0,
              provider: providerName
            };
            workflow.steps[i].status = 'completed';

            broadcast('workflow:step', {
              id: workflowId, stepIndex: i, step: step.name, status: 'completed',
              provider: providerName, content: accumulatedContent
            });
            break;
          } catch (err) {
            lastError = err;
            console.warn(`Streaming with provider ${providerName} failed: ${err.message}, trying next...`);
            broadcast('workflow:step:fallback', {
              id: workflowId,
              stepIndex: i,
              failedProvider: providerName,
              error: err.message
            });
          }
        }

        if (!success) {
          throw lastError || new Error('All providers failed during streaming');
        }
      } else if (step.type === 'image') {
        try {
          const imageProvider = await router.getAvailableImageProvider();
          const imageService = router.getImageProvider(imageProvider);
          
          let promptsToProcess = [];
          if (Array.isArray(promptText)) {
            promptsToProcess = promptText;
          } else if (typeof promptText === 'object' && promptText !== null) {
            promptsToProcess = [promptText];
          } else {
            promptsToProcess = [{ positive_prompt: String(promptText), negative_prompt: '' }];
          }

          const allImages = [];
          for (let pIndex = 0; pIndex < promptsToProcess.length; pIndex++) {
            const promptData = promptsToProcess[pIndex];
            
            // Broadcast step status update to show scene-level progress
            broadcast('workflow:step', {
              id: workflowId,
              stepIndex: i,
              step: `${step.name} (Scene ${pIndex + 1}/${promptsToProcess.length})`,
              status: 'running'
            });

            try {
              const res = await imageService.txt2img(
                promptData.positive_prompt || promptData.prompt || String(promptData),
                promptData.negative_prompt || '',
                promptData.recommended_settings || {}
              );
              if (res && res.images) {
                allImages.push(...res.images);
              }
            } catch (err) {
              console.warn(`Failed to generate image for a scene prompt: ${err.message}`);
            }
          }

          const result = { images: allImages, backend: imageProvider };
          workflow.results[step.id] = result;
          workflow.steps[i].result = result;
          workflow.steps[i].status = 'completed';

          broadcast('workflow:step', {
            id: workflowId, stepIndex: i, step: step.name, status: 'completed',
            backend: imageProvider, images: result.images
          });
        } catch (imgErr) {
          // Image generation is optional, mark as skipped
          workflow.steps[i].status = 'skipped';
          workflow.steps[i].error = imgErr.message;
          broadcast('workflow:step', {
            id: workflowId, stepIndex: i, step: step.name, status: 'skipped',
            error: imgErr.message
          });
        }
      }
    }

    workflow.status = 'completed';
    workflow.endTime = Date.now();
    broadcast('workflow:complete', { id: workflowId, results: workflow.results, duration: workflow.endTime - workflow.startTime });

    try {
      const telegramService = require('./telegram');
      const scriptText = workflow.results['story'] || '';
      const promptsText = workflow.results['prompts'] || '';
      
      if (scriptText) {
        const outputFilename = `Telegram_Script_${workflowId}.txt`;
        const outputPath = path.join(config.dataDir, outputFilename);
        const fs = require('fs');
        fs.writeFileSync(outputPath, `🎬 KỊCH BẢN PHIM ANIME DỌC (768x1366)\n\nÝ TƯỞNG: ${input}\n\n${scriptText}\n\n=========================\nPROMPT HÌNH ẢNH MINH HỌA:\n\n${promptsText}`);

        // Format a beautiful success summary
        const summary = `✅ <b>Kịch bản đã được tạo thành công!</b> 💙\n\n📁 <b>Project:</b> Anime Story EP\n🕒 <b>Thời gian hoàn tất:</b> ${new Date().toLocaleTimeString('vi-VN')}\n🆔 <b>Task ID:</b> <code>${workflowId}</code>\n\n📄 <i>Em đã đính kèm đầy đủ tệp kịch bản .txt và Album ảnh phân cảnh định dạng dọc 768x1366 tuyệt đẹp ở dưới cho Sensei xem nhé!</i>`;
        
        try {
          telegramService.broadcast(summary);
        } catch (e) {
          console.error('[Telegram broadcast summary failed]', e.message);
        }
        
        // Broadcast the packaged file
        for (const chatId of config.telegram.chatIds) {
          try {
            await telegramService.sendDocument(chatId.trim(), outputPath, `Kich_Ban_Anime_${workflowId}.txt`, `📄 Kịch bản đầy đủ (Task #${workflowId})`);
          } catch (e) {
            console.error(`[Telegram sendDocument failed for ${chatId}]`, e.message);
          }
        }
        
        // Broadcast generated preview album
        const imageResult = workflow.results['generate'];
        if (imageResult && imageResult.images && imageResult.images.length > 0) {
          const imagePaths = imageResult.images.map(img => path.join(config.outputDir, img.filename));
          for (const chatId of config.telegram.chatIds) {
            try {
              await telegramService.sendMediaGroup(chatId.trim(), imagePaths, `🎨 <b>Album tranh minh họa phân cảnh 768x1366:</b>`);
            } catch (e) {
              console.error(`[Telegram sendMediaGroup failed for ${chatId}]`, e.message);
            }
          }
        }
      }
    } catch (err) {
      console.error('[Telegram Notification Process Error]', err);
    }
  } catch (error) {
    workflow.status = 'failed';
    workflow.endTime = Date.now();
    workflow.error = error.message;
    broadcast('workflow:error', { id: workflowId, error: error.message });

    try {
      const telegramService = require('./telegram');
      telegramService.broadcast(`❌ <b>Script Generation Failed</b>\n\nError: <code>${error.message}</code>\nModule: <code>Workflow Engine</code>\nTask ID: <code>${workflowId}</code>`);
    } catch (err) {}
    throw error;
  }

  return workflow;
}

async function executeWorkflowStep(templateId, stepIndex, input, prevResults = {}, broadcast) {
  const template = workflowTemplates[templateId];
  if (!template) throw new Error(`Unknown workflow template: ${templateId}`);

  const step = template.steps[stepIndex];
  if (!step) throw new Error(`Step index ${stepIndex} out of bounds for template ${templateId}`);

  const workflowId = `wf_step_${Date.now()}`;
  const stepStartTime = Date.now();
  
  // Broadcast that the step has started
  broadcast('workflow:step', { id: workflowId, stepIndex, step: step.name, status: 'running' });

  console.log(`[DEBUG] executeWorkflowStep index: ${stepIndex}, prevResults keys:`, Object.keys(prevResults), 'prevResults:', JSON.stringify(prevResults).substring(0, 500));
  const promptText = step.prompt(input, prevResults);
  console.log(`[DEBUG] executeWorkflowStep index: ${stepIndex}, generated promptText length: ${promptText.length}`);
  const result = { status: 'completed', content: null, images: null, provider: null, backend: null };

  try {
    if (step.type === 'text') {
      const providers = await router.getProviderOrder(step.taskType);
      let success = false;
      let lastError = null;
      let accumulatedContent = '';

      for (const providerName of providers) {
        const providerConfig = config[providerName];
        if (providerName !== 'ollama' && !providerConfig?.apiKey) continue;

        try {
          const service = router.getTextProvider(providerName);
          const gen = service.stream(
            typeof promptText === 'string' ? promptText : JSON.stringify(promptText),
            step.options?.model,
            { jsonMode: step.options?.jsonMode, maxTokens: step.options?.maxTokens || 32000 }
          );

          accumulatedContent = '';
          let lastTokenTime = Date.now();

          // Keepalive ping interval — sends heartbeat every 15s
          const keepaliveTimer = setInterval(() => {
            const elapsed = Math.round((Date.now() - stepStartTime) / 1000);
            broadcast('workflow:step:keepalive', {
              id: workflowId,
              stepIndex,
              elapsed,
              provider: providerName
            });

            // Idle timeout check: if no token received for STEP_IDLE_TIMEOUT, we should let
            // the stream timeout naturally via the SDK timeout setting (already configured)
          }, KEEPALIVE_INTERVAL);

          try {
            for await (const chunk of gen) {
              if (chunk.content) {
                accumulatedContent += chunk.content;
                lastTokenTime = Date.now();
                // Broadcast progress in real-time
                broadcast('workflow:step:progress', {
                  id: workflowId,
                  stepIndex,
                  content: accumulatedContent
                });
              }
            }
          } finally {
            clearInterval(keepaliveTimer);
          }

          if (!accumulatedContent || accumulatedContent.trim() === '') {
            throw new Error('AI provider returned empty content (possibly due to silent connection drop or model loading hang)');
          }

          success = true;
          result.content = accumulatedContent;
          result.provider = providerName;
          result.model = step.options?.model || config[providerName].defaultModel;
          break;
        } catch (err) {
          lastError = err;
          console.warn(`Streaming with provider ${providerName} failed: ${err.message}, trying next...`);
          broadcast('workflow:step:fallback', {
            id: workflowId,
            stepIndex,
            failedProvider: providerName,
            error: err.message
          });
        }
      }

      if (!success) {
        throw lastError || new Error('All providers failed during streaming');
      }
    } else if (step.type === 'image') {
      const imageProvider = await router.getAvailableImageProvider();
      const imageService = router.getImageProvider(imageProvider);
      
      let promptsToProcess = [];
      if (Array.isArray(promptText)) {
        promptsToProcess = promptText;
      } else if (typeof promptText === 'object' && promptText !== null) {
        promptsToProcess = [promptText];
      } else {
        promptsToProcess = [{ positive_prompt: String(promptText), negative_prompt: '' }];
      }

      const allImages = [];
      for (let pIndex = 0; pIndex < promptsToProcess.length; pIndex++) {
        const promptData = promptsToProcess[pIndex];
        
        // Broadcast step status update to show scene-level progress
        broadcast('workflow:step', {
          id: workflowId,
          stepIndex,
          step: `${step.name} (Scene ${pIndex + 1}/${promptsToProcess.length})`,
          status: 'running'
        });

        try {
          const res = await imageService.txt2img(
            promptData.positive_prompt || promptData.prompt || String(promptData),
            promptData.negative_prompt || '',
            promptData.recommended_settings || {}
          );
          if (res && res.images) {
            allImages.push(...res.images);
          }
        } catch (err) {
          console.warn(`Failed to generate image for a scene prompt: ${err.message}`);
        }
      }

      result.images = allImages;
      result.backend = imageProvider;
    }

    broadcast('workflow:step', {
      id: workflowId,
      stepIndex,
      step: step.name,
      status: 'completed',
      provider: result.provider,
      backend: result.backend,
      content: result.content,
      images: result.images
    });

    return result;
  } catch (error) {
    broadcast('workflow:step', {
      id: workflowId,
      stepIndex,
      step: step.name,
      status: 'skipped',
      error: error.message
    });
    throw error;
  }
}

function getWorkflow(id) {
  return workflows.get(id);
}

function getTemplates() {
  return Object.values(workflowTemplates).map(t => ({
    id: t.id, name: t.name, description: t.description, stepCount: t.steps.length,
    steps: t.steps.map(s => ({ id: s.id, name: s.name, type: s.type }))
  }));
}

module.exports = { executeWorkflow, executeWorkflowStep, getWorkflow, getTemplates, workflowTemplates, workflows };
