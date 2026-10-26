import {
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from "@nestjs/common";
import { Prisma } from "../../prisma/generated/client";
import { PrismaService } from "../prisma.service";

@Injectable()
export class CheckoutReceiptRetention implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private readonly logger = new Logger(CheckoutReceiptRetention.name);
  constructor(private readonly prisma: PrismaService) {}
  onModuleInit() {
    const run = () => {
      void this.compact().catch(() =>
        this.logger.warn("checkout_receipt_compaction_failed"),
      );
    };
    run();
    this.timer = setInterval(run, 60 * 60 * 1000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async compact() {
    if (this.busy) return;
    this.busy = true;
    try {
      const now = new Date();
      const rows = await this.prisma.checkoutReceipt.findMany({
        where: {
          replayUntil: { lte: now },
          response: { not: Prisma.DbNull },
          OR: [
            { order: { checkoutAttempt: { is: null } } },
            { order: { checkoutAttempt: { is: { state: "COMPLETED" } } } },
          ],
        },
        select: { id: true },
        take: 100,
        orderBy: { replayUntil: "asc" },
      });
      if (rows.length)
        await this.prisma.checkoutReceipt.updateMany({
          where: {
            id: { in: rows.map((row) => row.id) },
            replayUntil: { lte: now },
            OR: [
              { order: { checkoutAttempt: { is: null } } },
              { order: { checkoutAttempt: { is: { state: "COMPLETED" } } } },
            ],
          },
          data: { response: Prisma.DbNull },
        });
    } finally {
      this.busy = false;
    }
  }
}
