import { Injectable } from "@nestjs/common";
import { createConnection } from "node:net";
import { ProcessingError, processingPolicy } from "./processing-policy";

@Injectable()
export class ClamavScanner {
  private exchange(
    command: string,
    bytes?: Buffer,
    timeoutMs?: number,
  ): Promise<string> {
    const policy = processingPolicy();
    return new Promise((resolve, reject) => {
      const socket = createConnection({
        host: policy.scannerHost,
        port: policy.scannerPort,
      });
      let response = Buffer.alloc(0);
      let settled = false;
      const finish = (error?: ProcessingError, result?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        socket.destroy();
        if (error) reject(error);
        else resolve(result!);
      };
      const deadline = setTimeout(
        () => finish(new ProcessingError("scanner_timeout", true)),
        timeoutMs ?? policy.scanTimeoutMs,
      );
      socket.on("error", () =>
        finish(new ProcessingError("scanner_unavailable", true)),
      );
      socket.on("end", () =>
        finish(new ProcessingError("scanner_response_incomplete", true)),
      );
      socket.on("data", (chunk: Buffer) => {
        if (response.length + chunk.length > 4096) {
          finish(new ProcessingError("scanner_response_invalid", true));
          return;
        }
        response = Buffer.concat([response, chunk]);
        const end = response.indexOf(0);
        if (end >= 0)
          finish(undefined, response.subarray(0, end).toString("utf8").trim());
      });
      socket.on("connect", () => {
        socket.write(`z${command}\0`);
        if (!bytes) return;
        // One bounded image per connection. Chunk lengths use network order.
        for (let offset = 0; offset < bytes.length; offset += 65536) {
          const chunk = bytes.subarray(offset, offset + 65536);
          const header = Buffer.alloc(4);
          header.writeUInt32BE(chunk.length);
          socket.write(header);
          socket.write(chunk);
        }
        socket.write(Buffer.alloc(4));
      });
    });
  }

  async scan(bytes: Buffer): Promise<string> {
    if (bytes.length > processingPolicy().maxBytes)
      throw new ProcessingError("upload_too_large");
    const version = await this.exchange("VERSION");
    if (!version.startsWith("ClamAV "))
      throw new ProcessingError("scanner_version_invalid", true);
    const result = await this.exchange("INSTREAM", bytes);
    if (result === "stream: OK") return version;
    if (/^stream: Heuristics\.Limits\.Exceeded.* FOUND$/.test(result)) {
      throw new ProcessingError("scanner_limit_exceeded");
    }
    if (/^stream: .+ FOUND$/.test(result))
      throw new ProcessingError("scanner_infected", false, true);
    // Includes scan-limit and parser errors. Never interpret an unknown result
    // or daemon failure as a CLEAN verdict.
    throw new ProcessingError("scanner_scan_failed", true);
  }

  async checkAvailability(): Promise<void> {
    const version = await this.exchange(
      "VERSION",
      undefined,
      Math.min(processingPolicy().scanTimeoutMs, 2000),
    );
    if (!version.startsWith("ClamAV "))
      throw new ProcessingError("scanner_version_invalid", true);
  }
}
