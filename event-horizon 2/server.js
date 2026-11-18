// Zero-dependency static HTTP server for the SGR A* visualizer.
// Usage: node server.js            (PORT and HOST env vars optional)
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt']);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
  }
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    return send(res, 400, 'Bad Request');
  }
  if (urlPath === '/healthz') return send(res, 200, 'ok', { 'Content-Type': 'text/plain' });

  // Resolve safely inside ROOT (blocks ../ traversal)
  let file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden');
  if (urlPath.endsWith('/')) file = path.join(file, 'index.html');

  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) { file = path.join(file, 'index.html'); }
    fs.readFile(file, (err2, data) => {
      if (err2) {
        const nf = path.join(ROOT, '404.html');
        return fs.readFile(nf, (e3, d404) =>
          send(res, 404, e3 ? 'Not Found' : d404, { 'Content-Type': MIME['.html'] }));
      }
      const ext = path.extname(file).toLowerCase();
      const headers = {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
        Vary: 'Accept-Encoding',
      };
      const accepts = req.headers['accept-encoding'] || '';
      if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(accepts)) {
        data = zlib.gzipSync(data);
        headers['Content-Encoding'] = 'gzip';
      }
      headers['Content-Length'] = data.length;
      send(res, 200, req.method === 'HEAD' ? undefined : data, headers);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`EVENT HORIZON running at http://localhost:${PORT}`);
});
