import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { createBackendProxy } from '../src/research/backend-proxy.mjs';

async function serve(t, app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('API proxy preserves paths, query strings, JSON bodies and upstream status', async t => {
  const upstream = express();
  upstream.use(express.json());
  upstream.all('/api/intelligence/context', (req, res) => res.status(201).json({ query: req.query, body: req.body }));
  const base = await serve(t, upstream);
  const app = express();
  app.use(express.json());
  app.use('/api', createBackendProxy(base));
  const web = await serve(t, app);
  const response = await fetch(`${web}/api/intelligence/context?region=BajoPiura`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ region: 'AltoPiura' }),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { query: { region: 'BajoPiura' }, body: { region: 'AltoPiura' } });
});

test('missing or unreachable backend returns JSON errors rather than the SPA', async t => {
  for (const [base, expected, code] of [[undefined, 503, 'backend_not_configured'], ['https://unavailable.invalid', 502, 'backend_unavailable']]) {
    const app = express();
    app.use('/api', createBackendProxy(base, async () => { throw new Error('offline'); }));
    const web = await serve(t, app);
    const response = await fetch(`${web}/api/regions`);
    assert.equal(response.status, expected);
    assert.deepEqual(await response.json(), { error: code });
  }
});
