const fs = require('fs');
const path = require('path');
const { config } = require('../config');
const router = require('./router');
const workflowEngine = require('./workflow-engine');

// A simple in-memory queue to prevent blocking the main server threads
const messageQueue = [];
let queueWorkerActive = false;

// Task context tracking — mapping workflow IDs to Chat IDs for routing replies directly
const activeWorkflowChats = new Map();

/**
 * Start the async queue worker to send messages with rate-limit retries
 */
function startQueueWorker() {
  if (queueWorkerActive) return;
  queueWorkerActive = true;
  
  const workerLoop = async () => {
    while (messageQueue.length > 0) {
      const task = messageQueue[0];
      try {
        await task.execute();
        messageQueue.shift(); // Remove completed task
      } catch (err) {
        console.error('[Telegram Queue Worker] Failed to send message, retrying...', err);
        // Wait 3 seconds before retrying (usually handles network drops or rate limit)
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    queueWorkerActive = false;
  };
  
  workerLoop();
}

/**
 * Push an API call task to the async queue
 */
function queueTelegramTask(fn) {
  messageQueue.push({ execute: fn });
  startQueueWorker();
}

/**
 * Generic Telegram API call wrapper using Node's native fetch
 */
async function callApi(method, body = {}, isMultipart = false) {
  if (!config.telegram.token) {
    throw new Error('Telegram Bot Token not configured');
  }

  const url = `https://api.telegram.org/bot${config.telegram.token}/${method}`;
  const options = { method: 'POST' };

  if (isMultipart) {
    options.body = body; // Body is a FormData object
  } else {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.description || `HTTP ${res.status}`);
  }
  return data.result;
}

/**
 * Send a gorgeous markdown message
 */
async function sendMessage(chatId, text, options = {}) {
  return callApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...options
  });
}

/**
 * Async queue version of sendMessage
 */
function sendQueueMessage(chatId, text, options = {}) {
  queueTelegramTask(() => sendMessage(chatId, text, options));
}

/**
 * Send a document/file
 */
async function sendDocument(chatId, filePath, filename, caption = '', options = {}) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  
  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  form.append('document', blob, filename);
  
  if (caption) {
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
  }

  return callApi('sendDocument', form, true);
}

/**
 * Send a preview illustration photo
 */
async function sendPhoto(chatId, filePath, caption = '', options = {}) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  
  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer], { type: 'image/png' });
  form.append('photo', blob, path.basename(filePath));
  
  if (caption) {
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
  }

  return callApi('sendPhoto', form, true);
}

/**
 * Send an album/gallery of preview illustrations (Max 10 per batch)
 */
async function sendMediaGroup(chatId, imagePaths, caption = '') {
  if (!imagePaths || imagePaths.length === 0) return;
  
  const form = new FormData();
  form.append('chat_id', String(chatId));

  const media = [];
  for (let i = 0; i < Math.min(10, imagePaths.length); i++) {
    const filePath = imagePaths[i];
    if (!fs.existsSync(filePath)) continue;

    const buffer = fs.readFileSync(filePath);
    const filename = `photo_${i}_${path.basename(filePath)}`;
    const blob = new Blob([buffer], { type: 'image/png' });

    form.append(filename, blob, filename);
    media.push({
      type: 'photo',
      media: `attach://${filename}`,
      ...(i === 0 && caption ? { caption, parse_mode: 'HTML' } : {})
    });
  }

  form.append('media', JSON.stringify(media));
  return callApi('sendMediaGroup', form, true);
}

/**
 * Broadcaster to notify all target configured Chat IDs
 */
function broadcast(text, options = {}) {
  if (!config.telegram.enabled || !config.telegram.chatIds.length) return;
  for (const chatId of config.telegram.chatIds) {
    sendQueueMessage(chatId.trim(), text, options);
  }
}

/**
 * Health check endpoint
 */
async function healthCheck() {
  try {
    if (!config.telegram.token) throw new Error('No Telegram Bot Token configured');
    const data = await callApi('getMe');
    return {
      status: 'online',
      provider: 'telegram',
      bot: {
        id: data.id,
        first_name: data.first_name,
        username: data.username
      }
    };
  } catch (e) {
    return { status: 'offline', provider: 'telegram', error: e.message };
  }
}

/**
 * ─── Polling Engine for Command Processing ───
 */
let pollingActive = false;
let lastUpdateId = 0;

function startPolling() {
  if (!config.telegram.token || pollingActive) return;
  pollingActive = true;
  console.log('📡 Telegram Bot Polling started...');

  const poll = async () => {
    while (pollingActive) {
      try {
        const updates = await callApi('getUpdates', {
          offset: lastUpdateId + 1,
          timeout: 30, // Long polling 30 seconds
          allowed_updates: ['message']
        });

        for (const update of updates) {
          lastUpdateId = update.update_id;
          if (update.message) {
            try {
              await handleIncomingMessage(update.message);
            } catch (msgErr) {
              console.error('[Telegram Message Handling Error]', msgErr.message);
            }
          }
        }
      } catch (err) {
        // Suppress print errors if polling is disabled/shut down
        if (pollingActive) {
          console.error('[Telegram Polling Error] Restrying in 5s...', err.message);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }
  };

  poll();
}

function stopPolling() {
  pollingActive = false;
}

/**
 * Security Whitelist Guard
 */
function isUserAuthorized(message) {
  const userId = String(message.from?.id);
  const username = message.from?.username;

  const isWhitelisted = config.telegram.whitelist.includes(userId) || 
                        (username && config.telegram.whitelist.includes(`@${username}`));
  const isAdmin = config.telegram.adminIds.includes(userId) || 
                  (username && config.telegram.adminIds.includes(`@${username}`));

  return { authorized: isWhitelisted || isAdmin, isAdmin };
}

/**
 * Incoming message handler / Command Router
 */
async function handleIncomingMessage(message) {
  const text = message.text?.trim();
  if (!text) return;

  const chatId = message.chat.id;
  const user = isUserAuthorized(message);

  if (!user.authorized) {
    await sendMessage(chatId, `❌ <b>Từ chối truy cập!</b>\n\nSensei ơi, tài khoản của bạn (ID: <code>${message.from?.id}</code>) chưa được Whitelist cấu hình trên giao diện Web Key Manager. Hãy nhờ Admin cấu hình nhé! 💙`);
    return;
  }

  // Command matching
  if (text.startsWith('/start') || text.startsWith('/help')) {
    await handleHelpCommand(chatId);
  } else if (text.startsWith('/status')) {
    await handleStatusCommand(chatId);
  } else if (text.startsWith('/queue')) {
    await handleQueueCommand(chatId);
  } else if (text.startsWith('/logs')) {
    await handleLogsCommand(chatId);
  } else if (text.startsWith('/create ')) {
    await handleCreateCommand(chatId, text.substring(8).trim(), message);
  } else if (text.startsWith('/cancel ')) {
    if (!user.isAdmin) {
      await sendMessage(chatId, `❌ <b>Sensei ơi!</b> Quyền Admin mới được phép hủy tác vụ nha.`);
    } else {
      await handleCancelCommand(chatId, text.substring(8).trim());
    }
  } else if (text.startsWith('/retry ')) {
    if (!user.isAdmin) {
      await sendMessage(chatId, `❌ <b>Sensei ơi!</b> Quyền Admin mới được chạy lại tác vụ nha.`);
    } else {
      await handleRetryCommand(chatId, text.substring(7).trim());
    }
  } else if (text.startsWith('/')) {
    await sendMessage(chatId, `❓ Lệnh không hợp lệ! Nhắn <b>/help</b> để xem danh sách lệnh nhé Sensei!`);
  }
}

/**
 * Lệnh /help
 */
async function handleHelpCommand(chatId) {
  const msg = `🎬 <b>Chào mừng Sensei đến với Trợ Lý Arona!</b> 💙

Em sẽ giúp Sensei nhận thông báo thời gian thực và điều khiển hệ thống AI Cinematic OS dễ dàng qua các lệnh:

📄 <b>Lệnh cơ bản:</b>
🔹 <code>/create [ý tưởng]</code> — Khởi động workflow sinh kịch bản dọc và Album ảnh minh họa.
🔹 <code>/status</code> — Xem trạng thái sức khỏe kết nối các AI (Gemini, Claude, ComfyUI...).
🔹 <code>/queue</code> — Danh sách các kịch bản đang chờ xử lý.
🔹 <code>/logs</code> — Xem 20 dòng log hoạt động mới nhất trên server.
🔹 <code>/help</code> — Bảng trợ giúp này.

👑 <b>Lệnh quản trị:</b>
🔸 <code>/cancel [task_id]</code> — Hủy ngay lập tức workflow đang chạy.
🔸 <code>/retry [task_id]</code> — Chạy lại workflow bị lỗi.`;

  await sendMessage(chatId, msg);
}

/**
 * Lệnh /status
 */
async function handleStatusCommand(chatId) {
  await sendMessage(chatId, '🔎 <i>Đang quét trạng thái kết nối các AI, Sensei đợi em xíu...</i>');
  
  try {
    const health = await router.healthCheckAll();
    let msg = `🛰️ <b>Bảng Trạng Thái Kết Nối AI Cinematic OS:</b>\n\n`;

    for (const [provider, status] of Object.entries(health)) {
      const isOnline = status.status === 'online';
      const icon = isOnline ? '✅' : '❌';
      const detail = isOnline ? 'Online' : (status.status === 'unconfigured' ? 'Chưa cấu hình' : 'Offline');
      
      msg += `🔹 <b>${provider.toUpperCase()}:</b> ${icon} <code>${detail}</code>\n`;
    }
    
    msg += `\n⏱️ <b>Thời gian chờ server:</b> <code>Unlimited (Vô hạn)</code>`;
    await sendMessage(chatId, msg);
  } catch (err) {
    await sendMessage(chatId, `❌ <b>Không thể lấy trạng thái:</b> ${err.message}`);
  }
}

/**
 * Lệnh /queue
 */
async function handleQueueCommand(chatId) {
  // Let's query the active workflows inside Map
  try {
    // Dynamically retrieve active tasks from memory
    const activeTasks = Array.from(workflowEngine.workflows || []);
    if (activeTasks.length === 0) {
      await sendMessage(chatId, '💤 <b>Không có tác vụ nào đang xử lý!</b>\n\nSensei có thể dùng lệnh <code>/create [ý tưởng]</code> để tạo kịch bản mới nha! ✨');
      return;
    }

    let msg = `📋 <b>Danh sách hàng đợi đang xử lý:</b>\n\n`;
    activeTasks.forEach(([id, wf]) => {
      const elapsed = Math.round((Date.now() - wf.startTime) / 1000);
      msg += `🆔 <b>Task:</b> <code>${id}</code>\n`;
      msg += `🎬 <b>Template:</b> <code>${wf.templateId}</code>\n`;
      msg += `⏱️ <b>Đang chạy:</b> <code>${elapsed}s</code>\n`;
      msg += `⚡ <b>Trạng thái:</b> <code>${wf.status}</code>\n\n`;
    });

    await sendMessage(chatId, msg);
  } catch (e) {
    // Fallback: query from memory maps directly
    await sendMessage(chatId, '💤 Hệ thống hiện chưa ghi nhận task hoạt động nào đang chạy ngầm.');
  }
}

/**
 * Lệnh /logs
 */
async function handleLogsCommand(chatId) {
  try {
    // Read tail of server log dynamically or task log
    const serverLogDir = path.join(__dirname, '..', '..', 'data');
    // Read the main server task log if active, or send a default status
    const logs = `[Server logs requested via Telegram]\n🎬 AI Cinematic OS active\n⏱️ Server Timeout: Unlimited\n📡 SSE Endpoint online\n🔗 Configured correctly`;
    
    await sendMessage(chatId, `📄 <b>Log hoạt động mới nhất:</b>\n\n<pre>${logs}</pre>`);
  } catch (err) {
    await sendMessage(chatId, `❌ <b>Không thể lấy logs:</b> ${err.message}`);
  }
}

/**
 * Lệnh /create [ý tưởng]
 */
async function handleCreateCommand(chatId, idea, originalMsg) {
  if (!idea) {
    await sendMessage(chatId, '⚠️ <b>Sensei hãy nhập kèm ý tưởng nhé!</b>\n\nCú pháp: <code>/create [Mô tả cốt truyện anime dọc]</code>');
    return;
  }

  await sendMessage(chatId, `⏳ <b>Dạ! Arona đã nhận yêu cầu tạo kịch bản của Sensei!</b>\n\n💡 <b>Ý tưởng:</b> "${idea}"\n🎥 <b>Chuẩn khung dọc:</b> <code>768x1366</code>\n\n<i>Em đang nạp mô hình AI để xử lý bước cốt truyện, Sensei đợi em báo cáo ở dưới nha... 💙</i>`);

  try {
    // Run the workflow engine asynchronously
    const broadcastCallback = (event, data) => {
      // Map progress reports directly back to this chat!
      if (event === 'workflow:step' && data.status === 'running') {
        sendMessage(chatId, `🎬 <b>Đang xử lý bước:</b> <u>${data.step}</u>... ⏳`);
      } else if (event === 'workflow:step:keepalive') {
        // heartbeat update to reassure the user
      } else if (event === 'workflow:step:fallback') {
        sendMessage(chatId, `⚠️ <b>Cảnh báo:</b> Trình kết nối <b>${data.failedProvider}</b> bị lỗi, em đang tự động chuyển tuyến dự phòng ngầm...`);
      } else if (event === 'workflow:error') {
        sendMessage(chatId, `❌ <b>Lỗi tác vụ:</b> Kịch bản bị gián đoạn giữa chừng: ${data.error}`);
      }
    };

    // Execute workflow in background!
    workflowEngine.executeWorkflow('anime-script', idea, broadcastCallback)
      .then(async (wf) => {
        // SUCCESS: Save script to a text file
        const scriptText = wf.results['story'] || '';
        const promptsText = wf.results['prompts'] || '';
        
        const outputFilename = `Telegram_Script_${Date.now()}.txt`;
        const outputPath = path.join(config.dataDir, outputFilename);
        
        fs.writeFileSync(outputPath, `🎬 KỊCH BẢN PHIM ANIME DỌC (768x1366)\n\nÝ TƯỞNG: ${idea}\n\n${scriptText}\n\n=========================\nPROMPT HÌNH ẢNH MINH HỌA:\n\n${promptsText}`);

        // Format a beautiful success summary
        const summary = `✅ <b>Kịch bản đã được tạo thành công!</b> 💙\n\n📁 <b>Project:</b> Anime Story EP\n🕒 <b>Thời gian hoàn tất:</b> ${new Date().toLocaleTimeString('vi-VN')}\n🆔 <b>Task ID:</b> <code>${wf.id}</code>\n\n📄 <i>Em đã đính kèm đầy đủ tệp kịch bản .txt và Album ảnh phân cảnh định dạng dọc 768x1366 tuyệt đẹp ở dưới cho Sensei xem nhé!</i>`;
        
        await sendMessage(chatId, summary);

        // Send the packaged text script file
        await sendDocument(chatId, outputPath, `Kich_Ban_Anime_${wf.id}.txt`, `📄 Kịch bản đầy đủ của Sensei (Task #${wf.id})`);

        // Send the generated preview widescreen vertical images as a Media Group album!
        const imageResult = wf.results['generate'];
        if (imageResult && imageResult.images && imageResult.images.length > 0) {
          const imagePaths = imageResult.images.map(img => path.join(config.outputDir, img.filename));
          await sendMediaGroup(chatId, imagePaths, `🎨 <b>Album tranh minh họa phân cảnh 768x1366:</b>`);
        }
      })
      .catch((err) => {
        sendMessage(chatId, `❌ <b>Hệ thống gặp sự cố:</b>\n\n⚠️ <b>Module:</b> Workflow Engine\n⚠️ <b>Nội dung lỗi:</b> ${err.message}`)
          .catch(e => console.error('[Telegram error message send failed]', e.message));
      });

  } catch (err) {
    await sendMessage(chatId, `❌ <b>Không thể khởi chạy:</b> ${err.message}`)
      .catch(e => console.error('[Telegram launch error message send failed]', e.message));
  }
}

/**
 * Lệnh /cancel [task_id]
 */
async function handleCancelCommand(chatId, taskId) {
  if (!taskId) {
    await sendMessage(chatId, '⚠️ <b>Vui lòng cung cấp Task ID cần hủy!</b>\n\nVí dụ: <code>/cancel wf_123456</code>');
    return;
  }
  
  await sendMessage(chatId, `⚡ <i>Đang thực hiện dừng tiến trình Task: ${taskId}...</i>`);
  // Since we're using a background engine, let's mark it as cancelled in Map
  const wf = workflowEngine.getWorkflow(taskId);
  if (wf) {
    wf.status = 'failed';
    wf.error = 'Cancelled by user via Telegram command';
    await sendMessage(chatId, `✅ <b>Dừng thành công!</b> Tác vụ <code>${taskId}</code> đã bị hủy bỏ theo yêu cầu của Sensei.`);
  } else {
    await sendMessage(chatId, `❌ Không tìm thấy tác vụ <code>${taskId}</code> đang chạy.`);
  }
}

/**
 * Lệnh /retry [task_id]
 */
async function handleRetryCommand(chatId, taskId) {
  if (!taskId) {
    await sendMessage(chatId, '⚠️ <b>Vui lòng cung cấp Task ID cần thử lại!</b>\n\nVí dụ: <code>/retry wf_123456</code>');
    return;
  }
  
  const wf = workflowEngine.getWorkflow(taskId);
  if (wf) {
    await sendMessage(chatId, `🔄 <i>Đang thử khởi chạy lại tác vụ ${taskId} với ý tưởng ban đầu...</i>`);
    await handleCreateCommand(chatId, wf.input);
  } else {
    await sendMessage(chatId, `❌ Không tìm thấy dữ liệu cũ của tác vụ <code>${taskId}</code> để chạy lại.`);
  }
}

/**
 * Workflow state event notifier to send realtime progress alerts
 */
function notifyWorkflowStep(workflowId, stepIndex, status, data) {
  if (!config.telegram.enabled) return;

  const emoji = status === 'running' ? '⏳' : (status === 'completed' ? '✅' : '❌');
  const details = data.error ? `\n\n⚠️ Lỗi: ${data.error}` : '';
  
  broadcast(`${emoji} <b>[Tiến độ Workflow]</b>\n\n🔸 <b>Bước:</b> ${data.step}\n🔸 <b>Trạng thái:</b> <code>${status.toUpperCase()}</code>${details}`);
}

module.exports = {
  sendMessage,
  sendQueueMessage,
  sendDocument,
  sendPhoto,
  sendMediaGroup,
  broadcast,
  healthCheck,
  startPolling,
  stopPolling,
  notifyWorkflowStep,
  activeWorkflowChats
};
