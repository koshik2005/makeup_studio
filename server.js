import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local or .env into process.env if not already set
function loadEnv(file) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}
loadEnv('.env.local');
loadEnv('.env');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Route cache for dynamic API imports
const apiModules = new Map();

async function getApiHandler(apiName) {
  if (apiModules.has(apiName)) return apiModules.get(apiName);
  const apiPath = path.join(__dirname, 'api', `${apiName}.js`);
  if (!fs.existsSync(apiPath)) return null;
  const mod = await import(`file://${apiPath}`);
  const handler = mod.default;
  apiModules.set(apiName, handler);
  return handler;
}

const server = http.createServer(async (req, res) => {
  // Decorate response with helper methods used by Vercel serverless functions
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (data) {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(data));
    return res;
  };

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Handle API routes (/api/*)
  if (pathname.startsWith('/api/')) {
    const apiName = pathname.slice(5).replace(/\/$/, '');
    const handler = await getApiHandler(apiName);

    if (!handler) {
      res.status(404).json({ error: 'API route not found' });
      return;
    }

    // Attach parsed query parameters
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());

    // Collect and parse request body
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      const rawBody = Buffer.concat(chunks).toString();
      req.body = {};
      if (rawBody) {
        try {
          req.body = JSON.parse(rawBody);
        } catch {
          req.body = rawBody;
        }
      }

      try {
        await handler(req, res);
      } catch (err) {
        console.error(`Error in /api/${apiName}:`, err);
        if (!res.writableEnded) {
          res.status(500).json({ error: 'Internal Server Error' });
        }
      }
    });
    return;
  }

  // Handle clean URLs and static files
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';
  if (safePath === '/admin' || safePath === '\\admin') safePath = '/admin.html';

  let filePath = path.join(PUBLIC_DIR, safePath);

  // If path has no extension and file does not exist, check for .html
  if (!path.extname(filePath) && !fs.existsSync(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath += '.html';
    }
  }

  // Check if directory
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\nMakeup Studio running locally at:`);
  console.log(`  - Public Site: http://localhost:${PORT}`);
  console.log(`  - Admin Panel: http://localhost:${PORT}/admin\n`);
});
