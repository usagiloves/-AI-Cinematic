require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { config } = require('./config');

// Global Safety Nets to prevent crashing on third-party network timeouts
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
});

const aiRoutes = require('./routes/ai');
const imageRoutes = require('./routes/image');
const providerRoutes = require('./routes/providers');
const workflowRoutes = require('./routes/workflow');
const keyRoutes = require('./routes/keys');
const actorRoutes = require('./routes/actors');
const tokenTracker = require('./utils/token-tracker');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > 500) {
        console.log(`  ⏱️  ${req.method} ${req.path} — ${duration}ms`);
      }
    });
  }
  next();
});

// Extended timeout for heavy AI and workflow routes (Disabled / Unlimited)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/workflow/') || req.path.startsWith('/api/ai/')) {
    req.setTimeout(0);  // Unlimited
    res.setTimeout(0);  // Unlimited
  }
  next();
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/img', express.static(path.join(__dirname, '..', 'img')));

// Serve generated images from output folder
const outputDir = path.join(__dirname, '..', 'output');
const fs = require('fs');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
app.use('/output', express.static(outputDir));

// SSE clients
const sseClients = new Set();

app.get('/api/sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.write('data: {"type":"connected"}\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(msg);
  }
}

// Make broadcast available to routes
app.set('broadcast', broadcast);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    providers: {
      openai: !!config.openai.apiKey,
      gemini: !!config.gemini.apiKey,
      claude: !!config.claude.apiKey,
      a1111: config.a1111.url,
      comfyui: config.comfyui.url
    }
  });
});

// Token stats endpoints
app.get('/api/tokens/stats', (req, res) => {
  res.json(tokenTracker.getStats());
});

app.get('/api/tokens/summary', (req, res) => {
  const stats = tokenTracker.getStats();
  const summary = {
    totalTokens: stats.totalTokens,
    totalRequests: stats.totalRequests,
    providers: {},
    costEstimate: 0
  };

  // Pricing per 1M tokens (approximate USD)
  const pricing = {
    openai: { input: 2.5, output: 10 },
    gemini: { input: 0.075, output: 0.30 },
    claude: { input: 3, output: 15 },
    deepseek: { input: 0.14, output: 0.28 },
    openrouter: { input: 1.0, output: 3.0 }
  };

  for (const [name, data] of Object.entries(stats.providers)) {
    summary.providers[name] = {
      totalTokens: data.totalTokens,
      totalRequests: data.totalRequests,
      models: data.models
    };

    if (pricing[name]) {
      // Rough estimate: assume 60% prompt, 40% completion
      const promptTokens = data.totalTokens * 0.6;
      const completionTokens = data.totalTokens * 0.4;
      const cost = (promptTokens / 1000000) * pricing[name].input +
                   (completionTokens / 1000000) * pricing[name].output;
      summary.providers[name].estimatedCost = Math.round(cost * 10000) / 10000;
      summary.costEstimate += cost;
    }
  }

  summary.costEstimate = Math.round(summary.costEstimate * 10000) / 10000;
  res.json(summary);
});

app.get('/api/tokens/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const stats = tokenTracker.getStats();
  res.json(stats.history.slice(-limit));
});

app.post('/api/tokens/reset', (req, res) => {
  tokenTracker.reset();
  res.json({ message: 'Token stats reset' });
});

// API Routes
app.use('/api/ai', aiRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/actors', actorRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`\n  🎬 AI Cinematic OS v2.5 running at http://localhost:${PORT}\n`);
  console.log(`  📡 SSE endpoint: http://localhost:${PORT}/api/sse`);
  console.log(`  🔗 OpenAI: ${config.openai.apiKey ? '✅ configured' : '❌ not set'}`);
  console.log(`  ✨ Gemini: ${config.gemini.apiKey ? '✅ configured' : '❌ not set'}`);
  console.log(`  🧩 Claude: ${config.claude.apiKey ? '✅ configured' : '❌ not set'}`);
  console.log(`  🌐 OpenRouter: ${config.openrouter.apiKey ? '✅ configured' : '❌ not set'}`);
  console.log(`  🎨 A1111:  ${config.a1111.url}`);
  console.log(`  🖼️  ComfyUI: ${config.comfyui.url}`);
  console.log(`  ⏱️  Server timeout: Unlimited\n`);

  // Initialize Telegram Bot Polling if configured
  try {
    const telegramService = require('./services/telegram');
    if (config.telegram.token) {
      telegramService.startPolling();
      console.log(`  🌐 Telegram Bot: ✅ active\n`);
    } else {
      console.log(`  🌐 Telegram Bot: ❌ not set\n`);
    }
  } catch (err) {
    console.error('  🌐 Telegram Bot Init Error:', err.message);
  }
});

// Critical: Remove server-level timeouts entirely for unlimited AI generations
server.timeout = 0;         // Unlimited — no connection timeout
server.headersTimeout = 0;  // Unlimited
server.requestTimeout = 0;  // Unlimited
server.keepAliveTimeout = 0; // Unlimited

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n  🛑 Shutting down gracefully...');
  try {
    require('./services/telegram').stopPolling();
  } catch (e) {}
  server.close(() => {
    console.log('  ✅ Server closed\n');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n  🛑 Shutting down...');
  try {
    require('./services/telegram').stopPolling();
  } catch (e) {}
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;
