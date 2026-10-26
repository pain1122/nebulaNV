import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import { OrderService } from "./order.service";

@Injectable()
export class CheckoutRecovery
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(CheckoutRecovery.name);
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  constructor(private readonly orders: OrderService) {}
  onApplicationBootstrap() {
    const run = () => {
      void this.tick().catch(() =>
        this.logger.warn("checkout_recovery_retry_pending"),
      );
    };
    run();
    this.timer = setInterval(run, 5000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      // One failing dependency must not starve the other durable recovery pass.
      const failures: unknown[] = [];
      try {
        await this.orders.recoverCheckouts();
      } catch (error) {
        failures.push(error);
      }
      try {
        await this.orders.recoverOrderCancellations();
      } catch (error) {
        failures.push(error);
      }
      try {
        await this.orders.recoverDemoPayments();
      } catch (error) {
        failures.push(error);
      }
      if (failures.length)
        throw new AggregateError(failures, "order_recovery_pending");
    } finally {
      this.busy = false;
    }
  }
}
