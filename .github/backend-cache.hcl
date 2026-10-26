// CI-only overlay. Normal local Bake/Compose never loads this file.
// Distinct image scopes preserve each final image plus shared max-mode layers.
variable "NEBULA_CI_CACHE_WRITE" {
  default = false
}

function "ci_cache_from" {
  params = [service]
  result = ["type=gha,version=2,scope=nebula-backend-graph-v1-${service},timeout=2m"]
}

function "ci_cache_to" {
  params = [service]
  result = NEBULA_CI_CACHE_WRITE ? ["type=gha,version=2,scope=nebula-backend-graph-v1-${service},mode=max,timeout=3m,ignore-error=true"] : []
}

target "user-service" {
  cache-from = ci_cache_from("user-service")
  cache-to = ci_cache_to("user-service")
}

target "auth-service" {
  cache-from = ci_cache_from("auth-service")
  cache-to = ci_cache_to("auth-service")
}

target "realm-auth-service" {
  cache-from = ci_cache_from("realm-auth-service")
  cache-to = ci_cache_to("realm-auth-service")
}

target "tenant-authority-service" {
  cache-from = ci_cache_from("tenant-authority-service")
  cache-to = ci_cache_to("tenant-authority-service")
}

target "settings-service" {
  cache-from = ci_cache_from("settings-service")
  cache-to = ci_cache_to("settings-service")
}

target "media-service" {
  cache-from = ci_cache_from("media-service")
  cache-to = ci_cache_to("media-service")
}

target "taxonomy-service" {
  cache-from = ci_cache_from("taxonomy-service")
  cache-to = ci_cache_to("taxonomy-service")
}

target "product-service" {
  cache-from = ci_cache_from("product-service")
  cache-to = ci_cache_to("product-service")
}

target "blog-service" {
  cache-from = ci_cache_from("blog-service")
  cache-to = ci_cache_to("blog-service")
}

target "order-service" {
  cache-from = ci_cache_from("order-service")
  cache-to = ci_cache_to("order-service")
}

target "gateway" {
  cache-from = ci_cache_from("gateway")
  cache-to = ci_cache_to("gateway")
}
