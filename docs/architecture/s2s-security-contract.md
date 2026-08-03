# S2S Security Contract

Status: implemented for all eight backend gRPC services on 2026-07-11.

## Boundary

S2S v2 authenticates unary internal gRPC calls. Browser HTTP requests use the JWT/gateway boundary and never receive S2S keys or headers. Client-streaming and bidirectional-streaming RPCs are deliberately rejected until a stream-specific signing contract exists.

Every gRPC method requires S2S identity. `@Public()` only makes the end-user JWT optional; it never makes an RPC unsigned.

## Signed Envelope

Each call carries one value for every field:

- protocol version (`2`)
- caller name and caller kind (`service` or `gateway`)
- target service
- transport method (`grpc`)
- actual protobuf RPC path
- issued-at time in milliseconds
- unique nonce
- request ID
- key ID
- SHA-256 digest of the serialized protobuf request
- HMAC-SHA256 signature

The signature is a versioned JSON-array payload. Verification uses constant-time comparison. The server interceptor independently captures the real RPC path and reserializes the received request with the registered generated definition before the guard compares path and body digest.

## Trust Model

Keys are pairwise and directional. A caller receives only the outbound keys for targets it may call. A target receives only the inbound keys for callers it accepts.

Service and gateway trust bundles are separate:

```env
S2S_OUTBOUND_KEYS={"target-service":{"id":"caller-target-2026-07","secret":"32-byte-or-longer-random-secret"}}
S2S_INBOUND_KEYS={"caller-service":{"current":{"id":"caller-target-2026-07","secret":"same-pairwise-secret"}}}
GATEWAY_INBOUND_KEYS={"gateway":{"current":{"id":"gateway-target-2026-07","secret":"different-random-secret"}}}
```

There is no shared S2S master secret and no gateway/inter-service secret reuse. Startup rejects malformed maps, a missing inbound trust bundle, invalid service identity, unsafe clock configuration, gateway/service key overlap, and an in-memory production replay store.

## Rotation

Inbound edges may accept one current key and one time-limited previous key:

```json
{
  "caller-service": {
    "current": {
      "id": "caller-target-2026-08",
      "secret": "new-random-secret-at-least-32-bytes"
    },
    "previous": {
      "id": "caller-target-2026-07",
      "secret": "old-random-secret-at-least-32-bytes",
      "notAfter": "2026-08-15T00:00:00.000Z"
    }
  }
}
```

Rotation order:

1. Add the new target inbound key as `current` and retain the old key as `previous` with a fixed expiry.
2. Change the caller outbound key to the new current key.
3. Confirm calls use the new key ID.
4. Remove the previous key after `notAfter`.

Outbound signing never chooses the previous key.

## Replay And Time

- Default clock skew: 30 seconds, configurable from 1 to 120 seconds.
- Every call gets fresh metadata, nonce, timestamp, and request ID.
- Redis claims `kind + caller + target + key ID + nonce` atomically with `SET NX PX`.
- A duplicate nonce is rejected.
- An invalid signature is rejected before the nonce claim, so it cannot poison a valid request.
- Redis failure returns unavailable and denies the call.
- Memory replay storage is test-only and forbidden in production.

## Verification Order

The receiving chain is:

1. generated-definition server interceptor captures trusted RPC identity/body digest;
2. `S2SGuard` verifies caller, target, binding, time, signature, route policy, and replay;
3. `GrpcTokenAuthGuard` verifies optional/required user JWT and attaches user context;
4. controller/resource authorization runs.

Verified caller identity is attached only after all S2S checks pass.

`@InternalOnly()` requires caller kind `service`. `@Public({ gatewayOnly: true })` requires caller kind `gateway`. `@AllowedS2SCallers(...)` restricts a route to named verified callers.

## Canonical Service Bootstrap

Each hybrid service must use the shared providers, generated service definitions, deferred Nest initialization, and the shared secure start helper:

```ts
const micro = app.connectMicroservice<MicroserviceOptions>(
  {
    transport: Transport.GRPC,
    options: {
      package: "example",
      protoPath: EXAMPLE_PROTO,
      url: grpcUrl,
      channelOptions: grpcS2SServerChannelOptions(
        examplev1.ExampleServiceService,
      ),
    },
  },
  { deferInitialization: true },
);

await startSecuredGrpc(app, micro);
```

`startSecuredGrpc` validates configuration, installs `S2SGuard` before `GrpcTokenAuthGuard`, prevents duplicate hybrid lifecycle hooks, initializes the application once, and only then starts gRPC listeners.

## Canonical Outbound Call

Sign the concrete generated method and concrete request immediately before each call:

```ts
const signed = buildGrpcS2SMetadata({
  target: SETTINGS_SERVICE_TARGET,
  definition: settings.SettingsServiceService.getString,
  request,
});

const metadata = mergeSignedMetadata(applicationMetadata, signed);
return client.getString(request, metadata);
```

Application metadata is preserved, but reserved S2S fields supplied by a caller are discarded. Passing custom metadata can never suppress or replace the fresh signature.

## Runtime Configuration

Common settings:

- `SVC_NAME`
- `PUBLIC_MODE` (default `OPTIONAL_AUTH`)
- `S2S_SIGNATURE_HEADER` (default `x-s2s-signature`)
- `S2S_MAX_CLOCK_SKEW_MS`
- `S2S_REPLAY_STORE`
- `S2S_REPLAY_REDIS_URL`, or `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `S2S_REPLAY_REDIS_DB`
- `S2S_OUTBOUND_KEYS`
- `S2S_INBOUND_KEYS`
- `GATEWAY_INBOUND_KEYS`

Release Redis is password-protected, has no host port, and is a healthy dependency of every backend service.

## Proven Denials

Focused tests cover missing signatures, wrong target/RPC/body, stale and future timestamps, replay and concurrent replay, unsupported versions, invalid signatures, expired previous keys, gateway/service key separation, caller allowlists, gateway-only/internal-only policy, private-route protection in `OPEN`, startup validation, and all eight service bootstrap templates.

This closes the S2S Enforcement slice only. Raw propagated user/role removal, order-status authorization, refresh-token policy, and broader HTTP/gRPC authorization parity remain separate F1 work.
