const storage = require('./storage');

const stats = {
  providers: {},
  totalTokens: 0,
  totalRequests: 0,
  history: []
};

// Load saved stats
const saved = storage.get('token_stats');
if (saved) Object.assign(stats, saved);

function track(result) {
  const { provider, model, usage, latency } = result;

  if (!stats.providers[provider]) {
    stats.providers[provider] = { totalTokens: 0, totalRequests: 0, models: {} };
  }

  const p = stats.providers[provider];
  p.totalTokens += usage.totalTokens;
  p.totalRequests += 1;

  if (!p.models[model]) {
    p.models[model] = { totalTokens: 0, requests: 0 };
  }
  p.models[model].totalTokens += usage.totalTokens;
  p.models[model].requests += 1;

  stats.totalTokens += usage.totalTokens;
  stats.totalRequests += 1;

  stats.history.push({
    timestamp: Date.now(),
    provider,
    model,
    tokens: usage.totalTokens,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    latency
  });

  // Keep last 1000 entries
  if (stats.history.length > 1000) {
    stats.history = stats.history.slice(-1000);
  }

  // Persist
  storage.set('token_stats', stats);
}

function getStats() {
  return {
    ...stats,
    history: stats.history.slice(-100)
  };
}

function getProviderStats(provider) {
  return stats.providers[provider] || { totalTokens: 0, totalRequests: 0, models: {} };
}

function reset() {
  stats.providers = {};
  stats.totalTokens = 0;
  stats.totalRequests = 0;
  stats.history = [];
  storage.set('token_stats', stats);
}

module.exports = { track, getStats, getProviderStats, reset };
