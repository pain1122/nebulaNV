import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  BeforeApplicationShutdown,
} from "@nestjs/common";
import { MediaProcessingStore } from "./media-processing.store";
import { MediaProcessingStorage } from "./media-processing.storage";
import { ClamavScanner } from "./clamav-scanner";
import { validateImage } from "./image-validation";
import { ProcessingError, processingPolicy } from "./processing-policy";

@Injectable()
export class MediaProcessingWorker
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private readonly log = new Logger(MediaProcessingWorker.name);
  private timer?: NodeJS.Timeout;
  private active?: Promise<void>;
  private stopped = false;
  private scannerPaused = false;

  constructor(
    private readonly store: MediaProcessingStore,
    private readonly storage: MediaProcessingStorage,
    private readonly scanner: ClamavScanner,
  ) {}

  onApplicationBootstrap() {
    if (
      !processingPolicy().enabled ||
      process.env.MEDIA_STORAGE_DRIVER === "local"
    )
      return;
    this.schedule();
  }

  private schedule() {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.active = this.runOnce()
        .then(() => undefined)
        .catch(() => {
          this.log.error("media_processing_poll_failed");
        })
        .finally(() => {
          this.active = undefined;
          this.schedule();
        });
    }, processingPolicy().pollMs);
    this.timer.unref();
  }

  async beforeApplicationShutdown() {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.active;
  }

  async runOnce(): Promise<boolean> {
    const cleanup = await this.store.nextCleanup();
    if (cleanup) {
      try {
        await this.storage.removeObject(cleanup.bucket, cleanup.path);
        await this.store.cleanupSucceeded(cleanup.id);
      } catch {
        await this.store.cleanupFailed(cleanup.id, cleanup.attempts);
        this.log.warn(`media_object_cleanup_failed id=${cleanup.id}`);
      }
    }
    try {
      // A daemon still loading signatures must not consume every queued file's
      // retry budget. Failures after a successful claim still use bounded retry.
      await this.scanner.checkAvailability();
    } catch {
      if (!this.scannerPaused)
        this.log.warn("media_scanner_unavailable_processing_paused");
      this.scannerPaused = true;
      return false;
    }
    if (this.scannerPaused)
      this.log.log("media_scanner_available_processing_resumed");
    this.scannerPaused = false;
    const job = await this.store.claim();
    if (!job) return false;
    try {
      const bytes = await this.storage.readUpload(
        job.media,
        job.expectedUploadBinding,
      );
      // Scan all bounded uploads, including malicious bytes disguised as an
      // allowed image. validateImage sniffs type before invoking image parsers.
      const scanner = await this.scanner.scan(bytes);
      const facts = await validateImage(
        bytes,
        job.media.mimeType,
        job.media.filename,
        job.expectedSha256,
      );
      const bucket = job.media.bucket ?? process.env.MEDIA_S3_BUCKET ?? "media";
      const root = (
        process.env.MEDIA_PRIVATE_FOLDER ?? "private/objects"
      ).replace(/\/+$/g, "");
      const path = `${root}/verified/${job.mediaId}/${job.leaseToken}/${facts.sha256}`;
      if (!(await this.store.planCopy(job, bucket, path))) return true;
      await this.storage.writeCopy(bucket, path, bytes, facts.mimeType);
      const accepted = await this.store.complete(job, {
        ...facts,
        bucket,
        path,
        scanner,
      });
      this.log.log(
        `media_processing_${accepted ? "completed" : "claim_lost"} id=${job.mediaId}`,
      );
    } catch (error) {
      const failure =
        error instanceof ProcessingError
          ? error
          : new ProcessingError("processing_dependency_failed", true);
      await this.store.fail(job, failure);
      this.log.warn(
        `media_processing_failed id=${job.mediaId} code=${failure.code}`,
      );
    }
    return true;
  }
}
