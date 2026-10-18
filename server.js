import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('dist');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
http.createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path !== root && !path.startsWith(root + '/')) throw new Error('Invalid path');
    const data = await readFile(path === root ? root + '/index.html' : path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || (path === root ? 'text/html' : 'application/octet-stream'), 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.PORT) || 5173, '0.0.0.0', () => console.log('Starts With, Ends With → http://localhost:' + (process.env.PORT || 5173)));
