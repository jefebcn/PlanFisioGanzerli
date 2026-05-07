import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';
import { initSocketIO } from './lib/realtime/socketServer';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || '/', true);
    handle(req, res, parsedUrl);
  });

  initSocketIO(httpServer);

  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`> Ready on http://${hostname}:${port} (Socket.IO at /api/socket.io)`);
  });
});
