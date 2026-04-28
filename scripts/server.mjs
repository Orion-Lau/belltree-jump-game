import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "0.0.0.0";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function resolveRequest(url) {
  const requestPath = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath === "/" ? "index.html" : safePath);
  const resolved = resolve(filePath);
  return resolved.startsWith(root) ? resolved : join(root, "index.html");
}

function getLocalIPv4Addresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}

const server = createServer((request, response) => {
  const filePath = resolveRequest(request.url || "/");
  const target = existsSync(filePath) && statSync(filePath).isFile() ? filePath : join(root, "index.html");
  response.writeHead(200, {
    "Content-Type": mime[extname(target)] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  createReadStream(target).pipe(response);
});

server.listen(port, host, () => {
  console.log(`鈴鈴村跳跳冒險 running at http://127.0.0.1:${port}`);
  for (const ip of getLocalIPv4Addresses()) {
    console.log(`同 Wi-Fi 裝置可試： http://${ip}:${port}`);
  }
});
