import { GatewayAuthController } from "../auth/gateway-auth.controller";
import { GatewayUserController } from "../user/gateway-user.controller";
import { GatewaySettingsController } from "../settings/gateway-settings.controller";
import { GatewayProductController } from "../product/gateway-product.controller";
import { GatewayBlogController } from "../blog/gateway-blog.controller";
import { GatewayProductTaxonomyController } from "../taxonomy/gateway-product-taxonomy.controller";
import { GatewayBlogTaxonomyController } from "../taxonomy/gateway-blog-taxonomy.controller";
import { GatewayOrderController } from "../order/gateway-order.controller";
import { GatewayMediaPublicController } from "../media/gateway-media-public.controller";
import { GatewayMediaProtectedController } from "../media/gateway-media-protected.controller";
import { GatewayMediaStrictController } from "../media/gateway-media-strict.controller";
import { GatewayMediaOwnedController } from "../media/gateway-media-owned.controller";
import { GatewayMediaRenderController } from "../media/gateway-media-render.controller";
import { GatewayMediaAdminController } from "../media/gateway-media-admin.controller";

// Runtime and contract-only OpenAPI generation import this exact list so
// neither can silently discover a different public surface.
export const GATEWAY_HTTP_CONTROLLERS = [
  GatewayAuthController,
  GatewayUserController,
  GatewaySettingsController,
  GatewayProductController,
  GatewayBlogController,
  GatewayProductTaxonomyController,
  GatewayBlogTaxonomyController,
  GatewayOrderController,
  GatewayMediaPublicController,
  GatewayMediaProtectedController,
  GatewayMediaStrictController,
  GatewayMediaOwnedController,
  GatewayMediaRenderController,
  // Keep the generic /admin/media/:id route after fixed lane prefixes so it
  // cannot consume "public-library", "protected-library", or "strict-library".
  GatewayMediaAdminController,
] as const;
