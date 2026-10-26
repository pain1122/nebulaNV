-- Status vocabulary only; no provider call or settlement is implied.
ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_PROCESSING' AFTER 'PENDING';
