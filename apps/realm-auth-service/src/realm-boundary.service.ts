import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "./prisma.service";

@Injectable()
export class RealmBoundaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async checkReadiness(): Promise<void> {
    const boundary = await this.prisma.realmBoundary.findUnique({
      where: { singleton: true },
      select: {
        identityRealmId: true,
        authRouteRef: true,
        issuer: true,
        admissionMode: true,
      },
    });
    if (
      !boundary ||
      boundary.identityRealmId !==
        this.config.getOrThrow<string>("REALM_AUTH_IDENTITY_REALM_ID") ||
      boundary.authRouteRef !==
        this.config.getOrThrow<string>("REALM_AUTH_ROUTE_REF") ||
      boundary.issuer !== this.config.getOrThrow<string>("REALM_AUTH_ISSUER") ||
      boundary.admissionMode !== "SHADOW"
    ) {
      throw new Error("realm_auth_shadow_boundary_not_ready");
    }
  }
}
