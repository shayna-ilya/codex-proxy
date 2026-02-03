const express = require('express');
const https = require('https');
const { URL } = require('url');
const app = express();

const TARGET_URL = 'https://chatgpt.com/backend-api/codex';

const upstreamBase = new URL(TARGET_URL);

// Проксирование всех запросов
app.all('*', (req, res) => {
  const targetPath = upstreamBase.pathname.replace(/\/$/, '') + req.originalUrl;
  const targetUrlForLog = `${upstreamBase.origin}${targetPath}`;

  console.log(`Proxying ${req.method} ${req.originalUrl} -> ${targetUrlForLog}`);

  const headers = { ...req.headers };
  headers.host = upstreamBase.host;
  delete headers.connection;

  const proxyReq = https.request(
    {
      protocol: upstreamBase.protocol,
      hostname: upstreamBase.hostname,
      port: upstreamBase.port || 443,
      method: req.method,
      path: targetPath,
      headers,
    },
    (proxyRes) => {
      res.statusCode = proxyRes.statusCode || 502;

      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        if (value !== undefined) res.setHeader(key, value);
      });

      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) res.status(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server is running on port ${PORT}`);
  console.log(`All requests will be forwarded to: ${TARGET_URL}`);
});
