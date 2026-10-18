import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, stat } from 'node:fs/promises';
const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
function harness() {
  const handlers = {}, entries = new Map(), deleted = [];
  let network = true, claimed = false;
  const context = {
    URL,
    self: { location:{origin:'https://example.test'}, addEventListener:(name, fn) => handlers[name] = fn, skipWaiting:async () => {}, clients:{claim:async () => { claimed = true; }} },
    caches: {
      open:async () => ({ addAll:async paths => { for (const path of paths) entries.set(path, {path}); } }),
      match:async req => entries.get(typeof req === 'string' ? req : (new URL(req.url).pathname + new URL(req.url).search).replace('/', './')),
      keys:async () => ['swew-v1', 'swew-v6', 'swew-v7', 'another-app'],
      delete:async key => deleted.push(key)
    },
    fetch:async () => { if (!network) throw new Error('Offline'); return {network:true}; }
  };
  vm.runInNewContext(worker, context);
  return {handlers, entries, deleted, setOffline:() => network = false, claimed:() => claimed};
}
async function event(handler) { let pending; handler({waitUntil:promise => pending = promise}); await pending; }
test('offline installation includes all existing local runtime assets', async () => {
  const h = harness(); await event(h.handlers.install);
  for (const asset of h.entries.keys()) assert.ok((await stat(new URL('../dist/' + (asset === './' ? 'index.html' : asset.slice(2)), import.meta.url))).isFile());
  for (const required of ['./index.html', './app.js?v=7', './game.js?v=7', './styles.css?v=7', './manifest.webmanifest']) assert.ok(h.entries.has(required));
});
test('activation only removes this game’s old caches and claims clients', async () => {
  const h = harness(); await event(h.handlers.activate);
  assert.deepEqual(h.deleted, ['swew-v1', 'swew-v6']); assert.equal(h.claimed(), true);
});
test('offline navigation and module requests use the installed copy', async () => {
  const h = harness(); await event(h.handlers.install); h.setOffline();
  for (const [path, mode, expected] of [['/', 'navigate', './index.html'], ['/app.js?v=7', 'cors', './app.js?v=7'], ['/game.js?v=7', 'cors', './game.js?v=7']]) {
    let response;
    h.handlers.fetch({request:{method:'GET',url:'https://example.test' + path, mode},respondWith:p => response = p});
    assert.equal((await response).path, expected);
  }
});
test('cross-origin and mutation requests are not intercepted', () => {
  const h = harness();
  for (const request of [{method:'POST',url:'https://example.test/'},{method:'GET',url:'https://another.test/'}]) {
    h.handlers.fetch({request,respondWith:() => assert.fail('Unexpected interception')});
  }
});
