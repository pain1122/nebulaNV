import {
  adminRoute,
  publicRoute,
  type GatewayRoutePolicy,
} from "./route-policy.core";

export const SETTINGS_ROUTES: readonly GatewayRoutePolicy[] = Object.freeze([
  publicRoute({
    id: "settings.get",
    method: "GET",
    path: "/api/v1/settings/:ns/:key",
    downstreamTarget: "settings-service",
    downstreamRpc: "SettingsService.GetString",
    input: "setting-public-key",
    successStatus: 200,
    response: "item",
    pagination: "none",
    retry: "safe",
  }),
  adminRoute({
    id: "admin.settings.set",
    method: "PUT",
    path: "/api/v1/admin/settings/:ns/:key",
    downstreamTarget: "settings-service",
    downstreamRpc: "SettingsService.SetString",
    input: "setting-admin-write",
    successStatus: 200,
    response: "item",
    pagination: "none",
    retry: "key",
  }),
  adminRoute({
    id: "admin.settings.delete",
    method: "DELETE",
    path: "/api/v1/admin/settings/:ns/:key",
    downstreamTarget: "settings-service",
    downstreamRpc: "SettingsService.DeleteString",
    input: "setting-admin-key",
    successStatus: 200,
    response: "action",
    pagination: "none",
    retry: "key",
  }),
]);
