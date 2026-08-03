import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import { Public } from "@nebula/grpc-auth";
import type { Response } from "express";
import { GetMediaDto, RenderMediaDto } from "./dto";
import { MediaService } from "./media.service";

@Public()
@Controller("media/render")
export class MediaRenderController {
  constructor(private readonly svc: MediaService) {}

  @Get(":id")
  async renderPublicMedia(
    @Param() p: GetMediaDto,
    @Query() q: RenderMediaDto,
    @Res() res: Response,
  ) {
    const render = await this.svc.openPublicRenderStream(p.id, q);

    res.setHeader("content-type", render.mimeType);
    res.setHeader("content-length", String(render.sizeBytes));
    res.setHeader("content-disposition", render.contentDisposition);
    res.setHeader("cache-control", render.cacheControl);
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("cross-origin-resource-policy", "cross-origin");
    if (render.etag) res.setHeader("etag", `"${render.etag}"`);

    render.stream.on("error", () => {
      if (!res.headersSent) res.status(502);
      res.end();
    });
    render.stream.pipe(res);
  }
}
