/**
 * dsh-usage-panel - host half (version-tolerant, dependency-free).
 *
 * Serves GET <routePath> (default /api/usage-panel/balance) with the DeepSeek
 * account balance. Prefers the authenticated Connection fetch registry and
 * falls back to a plain webserver route when a deployment lacks it. Resolves
 * the API key through the credentials seam, then the process environment.
 */
export const name = 'usage-panel';

const DEFAULTS = {
  routePath: '/api/usage-panel/balance',
  cacheMs: 30000,
  apiKeyEnv: 'DEEPSEEK_API_KEY',
  baseUrlEnv: 'DEEPSEEK_BASE_URL',
  baseUrl: 'https://api.deepseek.com',
};

function pick(config, key) {
  if (config !== null && typeof config === 'object' && config[key] !== undefined) return config[key];
  return DEFAULTS[key];
}

function baseUrlOf(config) {
  const envName = pick(config, 'baseUrlEnv');
  const fromEnv = envName !== undefined ? process.env[envName] : undefined;
  return String(fromEnv || pick(config, 'baseUrl')).replace(/\/+$/, '');
}

function jsonResponse(payload, status) {
  const init = { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } };
  if (typeof Response !== 'undefined' && typeof Response.json === 'function') return Response.json(payload, init);
  return new Response(JSON.stringify(payload), init);
}

export function apply(ctx, config) {
  const routePath = String(pick(config, 'routePath'));
  const cacheMs = Math.max(0, Number(pick(config, 'cacheMs')) || 0);
  let cache = { at: 0, payload: null };
  let inflight = null;

  async function resolveKey() {
    const envName = String(pick(config, 'apiKeyEnv'));
    try {
      if (ctx.credentials !== undefined && typeof ctx.credentials.resolve === 'function') {
        const resolved = await ctx.credentials.resolve(envName);
        if (resolved !== undefined && resolved !== null && typeof resolved.value === 'string' && resolved.value.length > 0) return resolved.value;
      }
    } catch (error) {
      if (ctx.logger !== undefined) ctx.logger.warn('usage-panel: credential resolve failed: ' + String(error));
    }
    return process.env[envName] || undefined;
  }

  async function load(force) {
    const now = Date.now();
    if (!force && cache.payload !== null && now - cache.at < cacheMs) return cache.payload;
    if (inflight !== null) return inflight;
    inflight = (async () => {
      const apiKey = await resolveKey();
      if (apiKey === undefined) return { ok: false, error: 'DeepSeek API key is not configured (' + String(pick(config, 'apiKeyEnv')) + ')' };
      const response = await fetch(baseUrlOf(config) + '/user/balance', {
        headers: { authorization: 'Bearer ' + apiKey, accept: 'application/json' },
      });
      if (!response.ok) return { ok: false, error: 'balance endpoint returned HTTP ' + response.status };
      const body = await response.json();
      const payload = {
        ok: true,
        updatedAt: new Date().toISOString(),
        provider: baseUrlOf(config),
        isAvailable: body.is_available !== false,
        balanceInfos: Array.isArray(body.balance_infos) ? body.balance_infos : [],
      };
      cache = { at: Date.now(), payload };
      return payload;
    })();
    try {
      return await inflight;
    } finally {
      inflight = null;
    }
  }

  async function handle(url) {
    let force = false;
    try {
      force = new URL(url, 'http://dsh.invalid').searchParams.get('fresh') === '1';
    } catch (error) {
      force = false;
    }
    try {
      return jsonResponse(await load(force), 200);
    } catch (error) {
      return jsonResponse({ ok: false, error: String((error && error.message) || error) }, 200);
    }
  }

  const fetcher = (request) => handle(request && request.url ? request.url : routePath);

  if (ctx.connection !== undefined && ctx.connection.fetch !== undefined && typeof ctx.connection.fetch.register === 'function') {
    ctx.connection.fetch.register({ path: routePath, methods: ['GET'], requestBody: 'buffered', fetch: fetcher });
  } else if (ctx.webServer !== undefined && typeof ctx.webServer.register === 'function') {
    ctx.webServer.register({
      kind: 'exact',
      path: routePath,
      handler: async (req, res) => {
        const response = await handle(req.url);
        const text = await response.text();
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
        res.end(text);
      },
    });
  } else {
    throw new Error('usage-panel: neither ctx.connection.fetch nor ctx.webServer is available');
  }

  if (ctx.logger !== undefined) ctx.logger.info('usage-panel: balance route ready at ' + routePath + ' -> ' + baseUrlOf(config));
  markLoaded(routePath);
}

/** Diagnostic marker confirming the host half is active. */
function markLoaded(routePath) {
  const fsUrl = new URL('../.state.json', import.meta.url);
  import('node:fs').then((fs) => {
    try {
      fs.writeFileSync(fsUrl, JSON.stringify({ loadedAt: new Date().toISOString(), route: routePath }, null, 2) + '\n');
    } catch (error) {
      void error;
    }
  });
}
