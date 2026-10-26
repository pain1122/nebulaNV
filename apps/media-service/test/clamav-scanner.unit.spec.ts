import { createServer, type Server, type Socket } from "node:net";
import { ClamavScanner } from "../src/processing/clamav-scanner";

describe("ClamAV INSTREAM adapter", () => {
  let server: Server;
  let sockets: Set<Socket>;
  let previousHost: string | undefined;
  let previousPort: string | undefined;
  let previousTimeout: string | undefined;
  let received: Buffer[];
  let scanReply: string;

  beforeEach(async () => {
    previousHost = process.env.MEDIA_SCANNER_HOST;
    previousPort = process.env.MEDIA_SCANNER_PORT;
    previousTimeout = process.env.MEDIA_SCANNER_TIMEOUT_MS;
    sockets = new Set();
    received = [];
    scanReply = "stream: OK";
    server = createServer((socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
      let input = Buffer.alloc(0);
      socket.on("data", (chunk: Buffer) => {
        input = Buffer.concat([input, chunk]);
        const end = input.indexOf(0);
        if (end < 0) return;
        const command = input.subarray(0, end).toString();
        if (command === "zVERSION") {
          socket.end("ClamAV test/123\0");
          return;
        }
        if (command !== "zINSTREAM") return;
        let offset = end + 1;
        const chunks: Buffer[] = [];
        while (offset + 4 <= input.length) {
          const size = input.readUInt32BE(offset);
          offset += 4;
          if (size === 0) {
            received.push(Buffer.concat(chunks));
            if (scanReply === "TIMEOUT") return;
            // Deliberately fragment the daemon response across socket writes.
            socket.write(scanReply.slice(0, 4));
            socket.end(`${scanReply.slice(4)}\0`);
            return;
          }
          if (offset + size > input.length) return;
          chunks.push(input.subarray(offset, offset + size));
          offset += size;
        }
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("test_server_address");
    process.env.MEDIA_SCANNER_HOST = "127.0.0.1";
    process.env.MEDIA_SCANNER_PORT = String(address.port);
    process.env.MEDIA_SCANNER_TIMEOUT_MS = "1000";
  });

  afterEach(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const [key, value] of Object.entries({
      MEDIA_SCANNER_HOST: previousHost,
      MEDIA_SCANNER_PORT: previousPort,
      MEDIA_SCANNER_TIMEOUT_MS: previousTimeout,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("streams the complete bytes with network-order chunk framing and requires OK", async () => {
    const bytes = Buffer.alloc(150_000, 42);
    await expect(new ClamavScanner().scan(bytes)).resolves.toBe(
      "ClamAV test/123",
    );
    expect(received).toEqual([bytes]);
  });

  it.each([
    ["stream: Eicar-Test-Signature FOUND", "scanner_infected"],
    [
      "stream: Heuristics.Limits.Exceeded.MaxFileSize FOUND",
      "scanner_limit_exceeded",
    ],
    ["INSTREAM size limit exceeded. ERROR", "scanner_scan_failed"],
    ["UNKNOWN COMMAND", "scanner_scan_failed"],
  ])("denies infected/error/ambiguous responses: %s", async (reply, code) => {
    scanReply = reply;
    await expect(
      new ClamavScanner().scan(Buffer.from("payload")),
    ).rejects.toThrow(code);
  });

  it("times out instead of approving a silent scanner", async () => {
    scanReply = "TIMEOUT";
    process.env.MEDIA_SCANNER_TIMEOUT_MS = "100";
    await expect(
      new ClamavScanner().scan(Buffer.from("payload")),
    ).rejects.toThrow("scanner_timeout");
  });
});
