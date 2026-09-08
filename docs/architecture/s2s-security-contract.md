# S2S Security Contract

Status: v2 is implemented for all eight backend gRPC services; strict
receiver-first v3 context acceptance was added on 2026-08-11.

## Boundary

S2S v2 and v3 authenticate unary internal gRPC calls. Browser HTTP requests use the JWT/gateway boundary and never receive S2S keys or headers. Client-streaming and bidirectional-streaming RPCs are deliberately rejected until a stream-specific signing contract exists.

Every gRPC method requires S2S identity. `@Public()` only makes the end-user JWT optional; it never makes an RPC unsigned.

## Signed Envelope

Each call carries one value for every field:

- protocol version (`2` or `3`)
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

V2 remains the byte-compatible context-free ordinary-service format. V3 adds
one `x-s2s-context` value containing unpadded base64url canonical JSON and one
lowercase `x-s2s-context-sha256` value. The v3 signature payload appends that
context digest after the existing body digest. Gateway-kind calls require v3;
ordinary service calls without verified ingress context remain v2.

The v3 JSON has only `version`, `applicationId`, `tenantId`, `siteId`,
`channelId`, and optional `actor`. Identifiers are safe ASCII values of 1-128
bytes, actor role is `user`, `admin`, or `root-admin`, and canonical JSON is at
most 1024 bytes. Unknown/null/array/extension fields, non-canonical encoding,
partial or duplicate carriers, context on v2, and altered context/digest are
rejected.

The signature is a versioned JSON-array payload. Verification uses constant-time comparison. The server interceptor independently captures the real RPC path and reserializes the received request with the registered generated definition before the guard compares path and body digest.

## Trust Model

Keys are pairwise and directional. A caller receives only the outbound keys for targets it may call. A target receives only the inbound keys for callers it accepts.

Service and gateway trust bundles are separate:

```env
S2S_OUTBOUND_KEYS={"target-service":{"id":"caller-target-2026-07","secret":"32-byte-or-longer-random-secret"}}
S2S_INBOUND_KEYS={"caller-service":{"current":{"id":"caller-target-2026-07","secret":"same-pairwise-secret"}}}
GATEWAY_INBOUND_KEYS={"gateway":{"current":{"id":"gateway-target-2026-07","secret":"different-random-secret"}}}
GATEWAY_OUTBOUND_KEYS={"target-service":{"id":"gateway-target-2026-07","secret":"same-gateway-pairwise-secret"}}
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
- Every public ingress gets a new request ID. Each downstream invocation gets
  fresh metadata, nonce, timestamp, caller/target proof, and signature; nested
  causal hops preserve only the guard-verified ingress request ID.
- Redis claims `kind + caller + target + key ID + nonce` atomically with `SET NX PX`.
- A duplicate nonce is rejected.
- An invalid signature is rejected before the nonce claim, so it cannot poison a valid request.
- Redis failure returns unavailable and denies the call.
- Memory replay storage is test-only and forbidden in production.

## Verification Order

The receiving chain is:

1. generated-definition server interceptor captures trusted RPC identity/body digest;
2. `S2SGuard` validates v2/v3 cardinality and canonical context, then verifies caller, target, binding, time, signature, route policy, and replay;
3. `GrpcTokenAuthGuard` verifies optional/required user JWT and attaches user context;
4. controller/resource authorization runs.

Verified caller identity is attached only after all S2S checks pass. V3
application/site context is attached as `requestContext`; its optional actor is
attached separately as `signedActor`, never as authoritative `user`.

For a gateway or any v3 hop, actor assertion and Bearer token must either both
be absent (anonymous) or both be present. Auth-service validates the Bearer and
the receiver requires exact `userId`, `role`, and non-secret `sessionRef`
agreement before attaching `user`. Legacy service-v2 Bearer calls remain
accepted during receiver-first migration and continue to rely on auth-service
truth without claiming v3 application context.

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

Gateway clients instead use `gatewayAuthAndS2S(...)` with the registry-derived
context and optional auth-verified bearer. That builder has no raw inbound HTTP
metadata parameter. It emits only the bearer allowlist plus fresh v3 signed
metadata.

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

The outbound-only gateway has a smaller startup contract:

- `S2S_SIGNATURE_HEADER`
- `GATEWAY_OUTBOUND_KEYS`

Its declared map must cover exactly the eight F3 downstream targets, with a
different secret for every gateway-to-target edge. It does not configure
receiver-only inbound maps, replay storage, replay Redis, `PUBLIC_MODE`, or a
gRPC listener. Each target service still owns the matching
`GATEWAY_INBOUND_KEYS` receiver entry and performs signature/replay checks.

Release Redis is password-protected, has no host port, and is a healthy dependency of every backend service.

## Proven Denials

Focused tests cover missing signatures, wrong target/RPC/body, stale and future timestamps, replay and concurrent replay, unsupported versions, invalid signatures, expired previous keys, gateway/service key separation, caller allowlists, gateway-only/internal-only policy, private-route protection in `OPEN`, startup validation, all eight service bootstrap templates, v2 compatibility, required gateway v3, canonical context bounds, and partial/duplicate/unsigned/altered context denial.

F3 extends this foundation with gateway v3 context and verified nested
propagation. Raw propagated user/role headers remain non-authoritative,
order-status authorization stays enforced by its domain owner, and refresh
rotation stays owned by Auth-service.

## F4 Default-Realm Compatibility (Receiver Prerequisite Partially Implemented)

[ADR-0010](decisions/0010-f4-signed-context-compatibility.md) preserves this
implemented S2S v2/v3 envelope and freezes an additive context schema v2. The
minimum Batch 3 resolver prerequisite now parses only strict
`RESOLUTION/AUTHORITY`, admits it only on its declared RPC, rejects v2 on
legacy routes, and refuses resolution propagation. It enables no writer,
`AUTHORIZED` context, domain consumer, cache, or traffic cutover. The original
plan placed those in Batch 4; ADR-0014 now keeps v2 receiver-only while Batch
1R freezes the additive realm-aware v3 path. The envelope already owns caller, target, RPC,
body digest, time, nonce, request ID, key, and context digest; context v2 will
not duplicate them.

Under the frozen default-realm compatibility design, context v2 distinguishes
a non-authorizing, exact-RPC `RESOLUTION` purpose from an `AUTHORIZED` ADR-0009
decision. It separates Auth actor identity from scoped membership/platform role
authority and carries explicit target plus authority revision/freshness. If a
default-realm operation is explicitly migrated to that design, receiver-first
rollout accepts v1 only on named legacy operations, requires v2 on the migrated
operation, and forbids dual carriers, automatic downgrade, or gateway fallback
to context-free S2S v2. Realm-aware operations require context v3 instead.

[ADR-0012](decisions/0012-f4-failure-freshness-audit-and-recovery.md) keeps S2S
transport freshness separate from authority-decision freshness. It freezes the
15-second ordinary authority ceiling, live-required sensitive operations,
60-second anonymous-public-only outage window, per-consumer authenticated cache
entries, and pairwise/purpose-separated compromise recovery. A valid S2S
signature never extends expired authority.

## F4 Realm-Aware Target (Not Implemented)

[ADR-0014](decisions/0014-f4-customer-identity-realms-and-federation.md)
preserves the envelope and strict v2 receiver but requires additive context v3
for multi-realm traffic. V3 context adds a realm-qualified subject, exact
application audience and identity-policy proof, and realm/application-bound
`sr2_` session plus `ar2_` authority references and their key IDs. ADR-0015
freezes their exact full-length HMAC construction and key-rotation stability.
It does not carry raw provider claims, email, password/credential facts,
internal session IDs, internal membership generation, or internal credential/
session generation.

The rollout remains receiver-first and exact-version. A route is explicitly
legacy v1, default-realm v2, or realm-aware v3; dual carriers, field unions,
automatic negotiation, and downgrade after a v3 rejection fail closed. S2S
still proves workload and message integrity only. Realm Auth independently
proves the actor/session, Tenant Authority proves target membership/trust, and
the domain owner repeats resource/operation authorization.

ADR-0015's bounded transition uses separately declared internal v2
compatibility and v3 methods. The gateway chooses one only after verifying the
session family; it never puts both carriers on one downstream call. Receivers
exist before any `sr2_` session, and rollback retains v3 validation until those
sessions drain or are revoked rather than projecting them into `sr1_`.
