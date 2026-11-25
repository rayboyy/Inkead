import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function nodeHttpGet(
  targetUrl: string,
  headers: Record<string, string>,
  redirectsLeft = 5
): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.get(
      targetUrl,
      {
        headers,
        rejectUnauthorized: false,
        timeout: 45000,
      },
      (res) => {
        const status = res.statusCode || 200;
        if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume();
          const nextUrl = new URL(res.headers.location, targetUrl).toString();
          resolve(nodeHttpGet(nextUrl, headers, redirectsLeft - 1));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const flatHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === 'string') flatHeaders[k.toLowerCase()] = v;
            else if (Array.isArray(v)) flatHeaders[k.toLowerCase()] = v.join(', ');
          }
          resolve({ status, headers: flatHeaders, body: Buffer.concat(chunks) });
        });
        res.on('error', reject);
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('Upstream request timed out'));
    });
    req.on('error', reject);
  });
}

function corsProxyPlugin(): Plugin {
  const handleProxy = async (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/proxy')) {
      return next();
    }

    // Enable CORS for preflight and standard requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition, Accept-Ranges');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const host = req.headers.host || 'localhost:5173';
    const parsedReqUrl = new URL(req.url, `http://${host}`);
    const targetUrl = parsedReqUrl.searchParams.get('url');

    if (!targetUrl) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing "url" query parameter' }));
      return;
    }

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/pdf,application/octet-stream,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    try {
      // If client specifically requested a range, pass it through directly
      if (req.headers.range) {
        const directRes = await fetch(targetUrl, {
          headers,
          signal: AbortSignal.timeout(30000),
        });
        res.statusCode = directRes.status;
        res.setHeader('Content-Type', directRes.headers.get('content-type') || 'application/octet-stream');
        if (directRes.headers.get('content-range')) {
          res.setHeader('Content-Range', directRes.headers.get('content-range')!);
        }
        if (directRes.headers.get('content-length')) {
          res.setHeader('Content-Length', directRes.headers.get('content-length')!);
        }
        const buf = await directRes.arrayBuffer();
        res.end(Buffer.from(buf));
        return;
      }

      // First, probe with Range: bytes=0-0 to detect range support & total size
      let initialRes: Response | null = null;
      try {
        initialRes = await fetch(targetUrl, {
          headers: { ...headers, Range: 'bytes=0-0' },
          signal: AbortSignal.timeout(15000),
        });
        // Some servers reject Range probes with 400/403/405/416/501 — retry without Range
        if ([400, 403, 405, 416, 501].includes(initialRes.status)) {
          await initialRes.body?.cancel();
          initialRes = await fetch(targetUrl, {
            headers,
            signal: AbortSignal.timeout(45000),
          });
        }
      } catch (probeErr: any) {
        console.warn('[Proxy probe error, trying direct fetch]:', probeErr.message);
        initialRes = await fetch(targetUrl, {
          headers,
          signal: AbortSignal.timeout(45000),
        });
      }

      const contentType = initialRes.headers.get('content-type') || 'application/octet-stream';
      const contentRange = initialRes.headers.get('content-range');
      const totalMatch = contentRange && contentRange.match(/\/(\d+)/);
      const totalSize = totalMatch
        ? parseInt(totalMatch[1], 10)
        : parseInt(initialRes.headers.get('content-length') || '0', 10);

      // If the server supports Range and totalSize is known (> 1MB), use chunked range downloading
      // to avoid abrupt server socket disconnects on institutional servers (e.g. NIC India).
      if (
        totalSize > 1024 * 1024 &&
        (contentRange || initialRes.status === 206 || initialRes.headers.get('accept-ranges') === 'bytes')
      ) {
        await initialRes.body?.cancel();
        const chunkSize = 2 * 1024 * 1024; // 2MB chunks
        const chunks: Uint8Array[] = [];
        let chunkedOk = true;

        for (let start = 0; start < totalSize; start += chunkSize) {
          const end = Math.min(start + chunkSize - 1, totalSize - 1);
          let chunkSuccess = false;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const chunkRes = await fetch(targetUrl, {
                headers: {
                  ...headers,
                  Range: `bytes=${start}-${end}`,
                },
                signal: AbortSignal.timeout(25000),
              });
              if (chunkRes.ok || chunkRes.status === 206) {
                const chunkBuf = await chunkRes.arrayBuffer();
                chunks.push(new Uint8Array(chunkBuf));
                chunkSuccess = true;
                break;
              }
              await chunkRes.body?.cancel();
            } catch (chunkErr: any) {
              console.warn(`[Proxy chunk retry ${attempt} for ${start}-${end}]:`, chunkErr.message);
              await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
            }
          }
          if (!chunkSuccess) {
            chunkedOk = false;
            break;
          }
        }

        if (chunkedOk && chunks.length > 0) {
          const actualTotal = chunks.reduce((sum, c) => sum + c.length, 0);
          const fullBuffer = new Uint8Array(actualTotal);
          let offset = 0;
          for (const chunk of chunks) {
            fullBuffer.set(chunk, offset);
            offset += chunk.length;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', fullBuffer.byteLength.toString());
          res.end(Buffer.from(fullBuffer));
          return;
        }
      }

      // Standard fetch for smaller files, articles, or if chunked mode fell back
      let fallbackRes = initialRes;
      if (initialRes.status === 206) {
        await initialRes.body?.cancel();
        fallbackRes = await fetch(targetUrl, {
          headers,
          signal: AbortSignal.timeout(45000),
        });
      }

      res.statusCode = fallbackRes.status;
      res.setHeader('Content-Type', fallbackRes.headers.get('content-type') || contentType);
      const fallbackBuf = await fallbackRes.arrayBuffer();
      res.setHeader('Content-Length', fallbackBuf.byteLength.toString());
      res.end(Buffer.from(fallbackBuf));
    } catch (err: any) {
      console.warn('[CORS Proxy fetch failed, trying node:https fallback]:', err.message);
      try {
        const nodeRes = await nodeHttpGet(targetUrl, headers);
        res.statusCode = nodeRes.status;
        res.setHeader('Content-Type', nodeRes.headers['content-type'] || 'application/octet-stream');
        res.setHeader('Content-Length', nodeRes.body.byteLength.toString());
        res.end(nodeRes.body);
      } catch (nodeErr: any) {
        console.error('[CORS Proxy Error]:', nodeErr.message);
        if (!res.headersSent) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: nodeErr.message || err.message || 'Proxy error' }));
        }
      }
    }
  };

  return {
    name: 'cors-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(handleProxy);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleProxy);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    corsProxyPlugin(),
  ],
});
