// Only the server reads this URL. Browsers always use the website's own /api.
export function createBackendProxy(backendUrl, fetchUpstream = fetch) {
  const base = backendUrl?.replace(/\/$/, '');
  return async (req, res) => {
    if (!base) return res.status(503).json({ error: 'backend_not_configured' });
    try {
      const response = await fetchUpstream(`${base}${req.originalUrl}`, {
        method: req.method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
        signal: AbortSignal.timeout(90_000),
      });
      const contentType = response.headers.get('content-type');
      if (contentType) res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-store');
      res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      res.status(timeout ? 504 : 502).json({ error: timeout ? 'backend_timeout' : 'backend_unavailable' });
    }
  };
}
