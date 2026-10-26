import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  BeforeApplicationShutdown,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import {
  MediaDerivativeStore,
  derivativeFacts,
  watermarkPins,
} from "./media-derivative.store";
import { MediaProcessingStorage } from "./media-processing.storage";
import { generateImageDerivatives, type VerifiedImage } from "./image-recipes";
import { ProcessingError, processingPolicy } from "./processing-policy";
import { SERVER_IMAGE_FONT, derivativesEnabled } from "./derivative-policy";

@Injectable()
export class MediaDerivativeWorker
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private readonly log = new Logger(MediaDerivativeWorker.name);
  private timer?: NodeJS.Timeout;
  private active?: Promise<void>;
  private stopped = false;
  constructor(
    private readonly store: MediaDerivativeStore,
    private readonly storage: MediaProcessingStorage,
  ) {}

  onApplicationBootstrap() {
    if (derivativesEnabled()) this.schedule();
  }
  private schedule() {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.active = this.runOnce()
        .then(() => undefined)
        .catch(() => {
          this.log.error("media_derivative_poll_failed");
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
    let job = await this.store.claim();
    if (!job) {
      await this.store.discoverDefault();
      job = await this.store.claim();
    }
    if (!job) return false;
    try {
      const source = await this.store.source(job.mediaId);
      const facts = derivativeFacts(source);
      if (facts.sha256 !== job.sourceSha256)
        throw new ProcessingError("image_source_changed");
      const bytes = await this.storage.readVerified(source.verifiedSource!);
      const pins = watermarkPins(job.watermarks);
      const cache = new Map<string, Promise<VerifiedImage>>();
      const outputs = await generateImageDerivatives(
        { ...facts, bytes },
        job.recipes as unknown[],
        {
          textFont: job.fontSha256
            ? { ...SERVER_IMAGE_FONT, sha256: job.fontSha256 }
            : undefined,
          resolveWatermark: (id) => {
            let pending = cache.get(id);
            if (!pending) {
              pending = (async () => {
                const row = await this.store.source(id);
                const pinned = pins.find((p) => p.mediaId === row.id);
                const watermark = derivativeFacts(row);
                if (!pinned || pinned.sha256 !== watermark.sha256)
                  throw new ProcessingError("image_watermark_changed");
                return {
                  ...watermark,
                  bytes: await this.storage.readVerified(row.verifiedSource!),
                };
              })();
              cache.set(id, pending);
            }
            return pending;
          },
        },
      );
      const root = (
        process.env.MEDIA_PRIVATE_FOLDER ?? "private/objects"
      ).replace(/\/+$/g, "");
      const copies = outputs.map((output) => ({
        ...output,
        bucket: source.verifiedSource!.bucket,
        path: `${root}/derivatives/${job.mediaId}/${job.id}/${job.leaseToken}/${output.view}-${output.sha256}.${output.recipe.format}`,
      }));
      if (!(await this.store.planCopies(job, copies))) return true;
      for (const copy of copies)
        await this.storage.writeCopy(
          copy.bucket,
          copy.path,
          copy.bytes,
          copy.mimeType,
        );
      const accepted = await this.store.complete(job, copies);
      this.log.log(
        `media_derivative_${accepted ? "completed" : "claim_lost"} id=${job.mediaId} generation=${job.id}`,
      );
    } catch (error) {
      const failure =
        error instanceof ProcessingError
          ? error
          : new ProcessingError(
              error instanceof ConflictException ||
              error instanceof NotFoundException
                ? "derivative_source_unavailable"
                : "derivative_dependency_failed",
              !(
                error instanceof ConflictException ||
                error instanceof NotFoundException
              ),
            );
      await this.store.fail(job, failure);
      this.log.warn(
        `media_derivative_failed id=${job.mediaId} code=${failure.code}`,
      );
    }
    return true;
  }
}
