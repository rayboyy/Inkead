import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type http from 'node:http';
import { URL } from 'node:url';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

    try {
      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      };

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      // First, probe or fetch
      let initialRes: Response;
      try {
        initialRes = await fetch(targetUrl, {
          headers: {
            ...headers,
            Range: req.headers.range || 'bytes=0-0', // probe to detect range support & total size
          },
        });
      } catch (probeErr: any) {
        console.warn('[Proxy probe error, trying direct fetch]:', probeErr.message);
        initialRes = await fetch(targetUrl, { headers });
      }

      const contentType = initialRes.headers.get('content-type') || 'application/octet-stream';
      const contentRange = initialRes.headers.get('content-range');
      const totalMatch = contentRange && contentRange.match(/\/(\d+)/);
      const totalSize = totalMatch ? parseInt(totalMatch[1], 10) : parseInt(initialRes.headers.get('content-length') || '0', 10);

      // If client specifically requested a range, pass it through
      if (req.headers.range) {
        const directRes = await fetch(targetUrl, { headers });
        res.statusCode = directRes.status;
        res.setHeader('Content-Type', directRes.headers.get('content-type') || contentType);
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

      // If the server supports Range and totalSize is known (> 1MB), use reliable chunked range downloading
      // to avoid abrupt server socket disconnects on government/institutional servers (e.g. NIC India).
      if (totalSize > 1024 * 1024 && (contentRange || initialRes.status === 206 || initialRes.headers.get('accept-ranges') === 'bytes')) {
        const chunkSize = 2 * 1024 * 1024; // 2MB chunks
        const chunks: Uint8Array[] = [];

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
              });
              if (chunkRes.ok || chunkRes.status === 206) {
                const chunkBuf = await chunkRes.arrayBuffer();
                chunks.push(new Uint8Array(chunkBuf));
                chunkSuccess = true;
                break;
              }
            } catch (chunkErr: any) {
              console.warn(`[Proxy chunk retry ${attempt} for ${start}-${end}]:`, chunkErr.message);
            }
          }
          if (!chunkSuccess) {
            throw new Error(`Failed to download range ${start}-${end} from target`);
          }
        }

        const fullBuffer = new Uint8Array(totalSize);
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

      // Standard fallback fetch for smaller files or articles
      const fallbackRes = initialRes.status === 200 ? initialRes : await fetch(targetUrl, { headers });
      res.statusCode = fallbackRes.status;
      res.setHeader('Content-Type', fallbackRes.headers.get('content-type') || contentType);
      const fallbackBuf = await fallbackRes.arrayBuffer();
      res.setHeader('Content-Length', fallbackBuf.byteLength.toString());
      res.end(Buffer.from(fallbackBuf));
    } catch (err: any) {
      console.error('[CORS Proxy Error]:', err.message);
      if (!res.headersSent) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Proxy error' }));
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
