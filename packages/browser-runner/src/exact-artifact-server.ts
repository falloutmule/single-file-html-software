import { createServer } from "node:http";

export interface ExactArtifactServer {
  readonly url: string;
  readonly servedRequestCount: () => number;
  close(): Promise<void>;
}

export async function startExactArtifactServer(bytes: Uint8Array): Promise<ExactArtifactServer> {
  const body = Buffer.from(bytes);
  let servedRequests = 0;
  const server = createServer((request, response) => {
    const method = request.method ?? "GET";
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    if (requestUrl.pathname !== "/index.html" || (method !== "GET" && method !== "HEAD")) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    servedRequests += 1;
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-length": String(body.byteLength),
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff"
    });
    response.end(method === "HEAD" ? undefined : body);
  });

  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolvePromise());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Exact artifact server did not receive a TCP address.");
  }
  return Object.freeze({
    url: `http://127.0.0.1:${address.port}/index.html`,
    servedRequestCount: () => servedRequests,
    close: () => new Promise<void>((resolvePromise, reject) => {
      server.close((error) => error === undefined ? resolvePromise() : reject(error));
    })
  });
}
