export function normalizeProductInput(input: any) {
    const d = { ...input };
  
    d.thumbnailUrl      = d.thumbnailUrl      ?? d.thumbnail_url      ?? null;
    d.model3dUrl        = d.model3dUrl        ?? d.model3d_url        ?? null;
    d.model3dFormat     = d.model3dFormat     ?? d.model3d_format     ?? null;
    d.model3dLiveView   = d.model3dLiveView   ?? d.model3d_live_view  ?? false;
    d.model3dPosterUrl  = d.model3dPosterUrl  ?? d.model3d_poster_url ?? null;
  
    d.vrEnabled         = d.vrEnabled         ?? d.vr_enabled         ?? false;
    d.vrPlanImageUrl    = d.vrPlanImageUrl    ?? d.vr_plan_image_url  ?? null;
  
    d.metaTitle         = d.metaTitle         ?? d.meta_title         ?? null;
    d.metaDescription   = d.metaDescription   ?? d.meta_description   ?? null;
    d.metaKeywords      = d.metaKeywords      ?? d.meta_keywords      ?? null;
    d.customSchema      = d.customSchema      ?? d.custom_schema      ?? null;
  
    d.isFeatured        = d.isFeatured        ?? d.is_featured        ?? false;
    d.featureSort       = d.featureSort       ?? d.feature_sort       ?? 0;
    d.promoTitle        = d.promoTitle        ?? d.promo_title        ?? null;
    d.promoBadge        = d.promoBadge        ?? d.promo_badge        ?? null;
    d.promoActive       = d.promoActive       ?? d.promo_active       ?? false;
  
    d.discountType      = d.discountType      ?? d.discount_type      ?? null;
    d.discountValue     = d.discountValue     ?? d.discount_value     ?? null;
    d.discountActive    = d.discountActive    ?? d.discount_active    ?? false;
    d.discountStart     = d.discountStart     ?? (d.discount_start ? new Date(d.discount_start) : null);
    d.discountEnd       = d.discountEnd       ?? (d.discount_end   ? new Date(d.discount_end)   : null);
  
    d.complementaryIds  = d.complementaryIds  ?? d.complementary_ids ?? [];
    d.categoryId        = d.categoryId        ?? d.category_id       ?? null;
  
    return d;
  }
  