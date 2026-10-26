// Docker Compose remains the source of image tags, contexts, and targets.
// This group defines the official eleven-image set. Normal local tooling invokes
// these targets sequentially so the first solve can commit shared layers before
// later targets reuse them; a direct group invocation may overwhelm Docker
// Desktop by materializing the same large stages concurrently.
// Direct Compose/Bake targets select their own graph. scripts/backend.mjs
// build-images gives each requested image the identical selected union (or all)
// so the first solve produces compilation layers that later exports reuse.
group "backend" {
  targets = [
    "user-service",
    "auth-service",
    "realm-auth-service",
    "tenant-authority-service",
    "settings-service",
    "media-service",
    "taxonomy-service",
    "product-service",
    "blog-service",
    "order-service",
    "gateway",
  ]
}
