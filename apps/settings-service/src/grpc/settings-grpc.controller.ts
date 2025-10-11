import {
  Controller,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { Metadata } from "@grpc/grpc-js";
import * as crypto from "crypto";

import { Public } from "@nebula/grpc-auth";
import { SettingsService } from "../settings.service";
import { settings } from "@nebula/protos";

const Pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

@Controller()
@UsePipes(Pipe)
export class SettingsGrpcController {
  private readonly log = new Logger(SettingsGrpcController.name);

  constructor(private readonly svc: SettingsService) {}

  // ------------------------------------------------------
  // Internal signature validator (HMAC)
  // ------------------------------------------------------
  private isInternal(meta?: Metadata): boolean {
    try {
      const headerName = process.env.GATEWAY_HEADER ?? "x-gateway-sign";
      const sig = meta?.get(headerName)?.[0] as string | undefined;
      if (!sig || !process.env.GATEWAY_SECRET) return false;

      const bucket = Math.floor(Date.now() / 60000); // time bucket = 1 min
      const expected = crypto
        .createHmac("sha256", process.env.GATEWAY_SECRET)
        .update(String(bucket))
        .digest("hex");

      return sig === expected;
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------
  // GetString (internal access only)
  // ------------------------------------------------------
  @Public()
  @GrpcMethod("SettingsService", "GetString")
  async getString(
    req: settings.GetReq,
    meta: Metadata,
  ): Promise<settings.GetStringRes> {
    if (!this.isInternal(meta))
      throw new ForbiddenException("Internal access only");

    const env = req.environment?.trim() ? req.environment : "default";
    const { value, found } = await this.svc.getString(
      req.namespace,
      req.key,
      env,
    );
    return settings.GetStringRes.create({ value: value ?? "", found });
  }

  // ------------------------------------------------------
  // SetString (internal access only)
  // ------------------------------------------------------
  @Public()
  @GrpcMethod("SettingsService", "SetString")
  async setString(
    req: settings.SetStringReq,
    meta: Metadata,
  ): Promise<settings.SetStringRes> {
    if (!this.isInternal(meta))
      throw new ForbiddenException("Internal access only");

    const env = req.environment?.trim() ? req.environment : "default";
    const value = await this.svc.setString(
      req.namespace,
      req.key,
      req.value,
      env,
    );

    this.log.debug(
      `[SettingsService] SetString ${req.namespace}/${req.key}=${req.value}`,
    );
    return settings.SetStringRes.create({ value });
  }

  // ------------------------------------------------------
  // DeleteString (internal access only)
  // ------------------------------------------------------
  @Public()
  @GrpcMethod("SettingsService", "DeleteString")
  async deleteString(
    req: settings.DeleteReq,
    meta: Metadata,
  ): Promise<settings.DeleteRes> {
    if (!this.isInternal(meta))
      throw new ForbiddenException("Internal access only");

    const env = req.environment?.trim() ? req.environment : "default";
    const deleted = await this.svc.deleteString(req.namespace, req.key, env);

    this.log.debug(
      `[SettingsService] DeleteString ${req.namespace}/${req.key} → ${deleted}`,
    );
    return settings.DeleteRes.create({ deleted });
  }
}
