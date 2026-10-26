INSERT INTO "Cart" ("id","userId","currency","updatedAt") VALUES
('fd200000-0000-4000-8000-000000000001','fd200000-0000-4000-8000-000000000099','EUR','2020-01-01');
INSERT INTO "CartItem" ("id","cartId","productId","sku","name","quantity","unitPrice","meta","updatedAt") VALUES
('fd200000-0000-4000-8000-000000000002','fd200000-0000-4000-8000-000000000001','fd100000-0000-4000-8000-000000000001','LEGACY-CART-SKU','Legacy cart item',2,12.5,'{"note":"preserve"}','2020-01-01');
INSERT INTO "Order" ("id","orderNumber","userId","currency","subtotal","total","shippingAddress","meta","updatedAt") VALUES
('fd200000-0000-4000-8000-000000000003','D1-UPGRADE-ORDER','fd200000-0000-4000-8000-000000000099','USD',25,25,'{"city":"Tehran"}','{"note":"preserve"}','2020-01-01');
INSERT INTO "OrderItem" ("id","orderId","productId","sku","name","quantity","unitPrice","lineTotal","updatedAt") VALUES
('fd200000-0000-4000-8000-000000000004','fd200000-0000-4000-8000-000000000003','fd100000-0000-4000-8000-000000000001','LEGACY-ORDER-SKU','Legacy order item',2,12.5,25,'2020-01-01');
