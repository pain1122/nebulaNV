type GatewayRateLimitRequest = {
  requestContext?: {
    applicationId?: unknown;
  };
  user?: {
    userId?: unknown;
  };
  socket?: {
    remoteAddress?: string;
  };
};

const SAFE_CONTEXT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function trustedId(value: unknown): string | undefined {
  return typeof value === "string" && SAFE_CONTEXT_ID.test(value)
    ? value
    : undefined;
}

function directPeer(request: GatewayRateLimitRequest): string {
  const address = request.socket?.remoteAddress?.trim();
  if (!address) return "unknown";
  return address.startsWith("::ffff:")
    ? address.slice("::ffff:".length)
    : address;
}

/**
 * Builds a collision-safe tracker from trusted request state only.
 *
 * Registry resolution attaches `requestContext.applicationId`, and Auth
 * verification attaches `user`. Raw client headers and forwarded IP headers
 * are deliberately not consulted.
 */
export function gatewayRateLimitTracker(
  request: GatewayRateLimitRequest,
): string {
  const applicationId = trustedId(request.requestContext?.applicationId);
  const actorId = trustedId(request.user?.userId);

  if (applicationId) {
    return JSON.stringify(
      actorId
        ? ["application", applicationId, "actor", actorId]
        : ["application", applicationId, "anonymous"],
    );
  }

  return JSON.stringify(["peer", directPeer(request)]);
}
