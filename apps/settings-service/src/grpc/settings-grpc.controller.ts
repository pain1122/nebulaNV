import { Controller, Logger } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { Metadata, status } from "@grpc/grpc-js";
import {
  AllowedS2SCallers,
  getContextService,
  InternalOnly,
  Public,
  Roles,
  resolveCtxUser,
  toRpc,
  type RpcContextWithContext,
} from "@nebula/grpc-auth";
import { SettingsService } from "../settings.service";
import { settings } from "@nebula/protos";

const BOOTSTRAP_SETTING_BY_CALLER = {
  "product-service": {
    namespace: "product",
    key: "default_product_category",
  },
  "blog-service": {
    namespace: "blog",
    key: "default_blog_category",
  },
} as const;

@Controller()
export class SettingsGrpcController {
  private readonly log = new Logger(SettingsGrpcController.name);
  constructor(private readonly svc: SettingsService) {}

  // Read can remain public
  @Public()
  @GrpcMethod("SettingsService", "GetString")
  async getString(req: settings.GetReq): Promise<settings.GetStringRes> {
    const env = req.environment?.trim() ? req.environment : "default";
    const result = await this.svc.getString(req.namespace, req.key, env);
    return settings.GetStringRes.create({
      value: result.value,
      found: result.found,
    });
  }

  // Writes: require admin/root-admin via JWT context
  @Roles("admin", "root-admin")
  @GrpcMethod("SettingsService", "SetString")
  async setString(
    req: settings.SetStringReq,
    meta: Metadata,
    call: RpcContextWithContext,
  ): Promise<settings.SetStringRes> {
    const ctx = resolveCtxUser(meta, call);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");
    const env = req.environment?.trim() ? req.environment : "default";
    const value = await this.svc.setString(
      req.namespace,
      req.key,
      req.value,
      env,
    );
    this.log.debug(
      `settings_string_set namespace=${req.namespace} key=${req.key}`,
    );
    return settings.SetStringRes.create({ value });
  }

  @Public()
  @InternalOnly()
  @AllowedS2SCallers("product-service", "blog-service")
  @GrpcMethod("SettingsService", "EnsureBootstrapString")
  async ensureBootstrapString(
    req: settings.SetStringReq,
    _meta: Metadata,
    call: RpcContextWithContext,
  ): Promise<settings.SetStringRes> {
    const caller = getContextService(call);
    if (!caller) {
      throw toRpc(status.UNAUTHENTICATED, "Missing service context");
    }

    const allowed =
      BOOTSTRAP_SETTING_BY_CALLER[
        caller as keyof typeof BOOTSTRAP_SETTING_BY_CALLER
      ];
    const namespace = req.namespace.trim().toLowerCase();
    const key = req.key.trim().toLowerCase();
    const environment = req.environment.trim().toLowerCase() || "default";

    if (!allowed || namespace !== allowed.namespace || key !== allowed.key) {
      throw toRpc(status.PERMISSION_DENIED, "Bootstrap setting not allowed");
    }
    if (environment !== "default") {
      throw toRpc(
        status.INVALID_ARGUMENT,
        "Bootstrap settings require the default environment",
      );
    }

    const value = await this.svc.setString(
      namespace,
      key,
      req.value,
      environment,
    );
    return settings.SetStringRes.create({ value });
  }

  @Roles("admin", "root-admin")
  @GrpcMethod("SettingsService", "DeleteString")
  async deleteString(
    req: settings.DeleteReq,
    meta: Metadata,
    call: RpcContextWithContext,
  ): Promise<settings.DeleteRes> {
    const ctx = resolveCtxUser(meta, call);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, "Missing user context");
    const env = req.environment?.trim() ? req.environment : "default";
    const deleted = await this.svc.deleteString(req.namespace, req.key, env);
    this.log.debug(
      `settings_string_deleted namespace=${req.namespace} key=${req.key} deleted=${deleted}`,
    );
    return settings.DeleteRes.create({ deleted });
  }
}
