// test-grpc.js
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, 'user.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const userProto = grpc.loadPackageDefinition(packageDef).user;

const client = new userProto.UserService(
  'localhost:50051',
  grpc.credentials.createInsecure(),
);

const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMGZmMGE4ZS1jYWYyLTQ3ODktOGYxNy01YzdkYjVlNTY5YjciLCJlbWFpbCI6Im5ld2VtYWlsQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTMyNjE0MzYsImV4cCI6MTc1MzI2MjMzNn0.J2HXadErsoq2qZINdPwIYnIA9vh1fXwnnUIDTGj7Jxs';  // include the "Bearer " prefix

// Build real Metadata
const metadata = new grpc.Metadata();
metadata.add('authorization', token);

client.GetUser(
  { id: 'c0ff0a8e-caf2-4789-8f17-5c7db5e569b7' },
  metadata,
  (err, response) => {
    if (err) {
      console.error('gRPC error:', err);
      process.exit(1);
    }
    console.log('gRPC response:', response);
  },
);
