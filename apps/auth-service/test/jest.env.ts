// Default values so you DON’T need to set env per shell
process.env.AUTH_HTTP_URL  ||= 'http://127.0.0.1:3001';
process.env.AUTH_GRPC_URL  ||= '127.0.0.1:50052';
process.env.USER_GRPC_URL  ||= '127.0.0.1:50051';

process.env.SVC_NAME       ||= 'auth-service';
process.env.GATEWAY_SECRET ||= 'GwChpbAKFdyDwMrdMad340pxwkUEKFMPdv6Vv7Abhn1kbHFL67q7agy8N2g9PFqTg4iWqL5UZxvtrF5s9w'; // change me

// Real admin (lets the admin→user & user→admin gRPC assertions run)
process.env.ADMIN_USER     ||= 'mytest3@gmail.com';
process.env.ADMIN_PASS     ||= 'MyStrongPass123!';