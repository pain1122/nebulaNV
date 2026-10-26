import { Controller } from "@nestjs/common";
import { type HealthProbe, StandardHealthController } from "@packages/config";
import { OperationalHealth, S2SReplayStore } from "@nebula/grpc-auth";
import { PrismaService } from "./prisma.service";
import { DefaultProductTaxonomyInitializer } from "./default-product-taxonomy.initializer";

@OperationalHealth()
@Controller("health")
export class HealthController extends StandardHealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly replayStore: S2SReplayStore,
    private readonly defaultTaxonomy: DefaultProductTaxonomyInitializer,
  ) {
    super("product-service");
  }

  protected readinessProbes(): readonly HealthProbe[] {
    return [
      {
        name: "database",
        check: async () => {
          await this.prisma.$queryRaw`SELECT 1`;
        },
      },
      {
        name: "metadataSchema",
        check: async () => {
          await this.prisma
            .$queryRaw`SELECT "thumbnailTitle", "thumbnailAlt" FROM "Product" LIMIT 0`;
          await this.prisma
            .$queryRaw`SELECT "title", "metadataVersion" FROM "ProductGalleryImage" LIMIT 0`;
        },
      },
      {
        name: "s2sReplay",
        check: () => this.replayStore.checkReadiness(),
      },
      {
        name: "defaultProductTaxonomy",
        check: () => this.defaultTaxonomy.checkReadiness(),
      },
    ];
  }
}
