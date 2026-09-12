import { GrpcMethod } from "@nestjs/microservices";
import { S2S_CONTEXT_RECEIVER_KEY } from "./public.decorator";

const RECEIVER_NAME = /^[A-Za-z][A-Za-z0-9]{0,127}$/;

/**
 * Register a distinct dormant R5 gRPC receiver that executes the same handler
 * as its legacy method while requiring the exact authorization context v3.
 */
export function DormantS2SAuthorizationV3Receiver(
  service: string,
  method: `${string}V3`,
): MethodDecorator {
  if (!RECEIVER_NAME.test(service) || !RECEIVER_NAME.test(method)) {
    throw new Error("s2s_v3_receiver_name_invalid");
  }
  return (target, propertyKey, descriptor) => {
    const original = descriptor.value;
    if (typeof original !== "function") {
      throw new Error("s2s_v3_receiver_handler_invalid");
    }
    const handler = original as (this: unknown, ...args: unknown[]) => unknown;
    const aliasKey = `${String(propertyKey)}__r5_v3`;
    if (Object.prototype.hasOwnProperty.call(target, aliasKey)) {
      throw new Error("s2s_v3_receiver_alias_duplicate");
    }
    const alias = function (this: unknown, ...args: unknown[]) {
      return handler.apply(this, args);
    };
    for (const metadataKey of Reflect.getOwnMetadataKeys(original)) {
      Reflect.defineMetadata(
        metadataKey,
        Reflect.getOwnMetadata(metadataKey, original),
        alias,
      );
    }
    Reflect.defineMetadata(
      S2S_CONTEXT_RECEIVER_KEY,
      Object.freeze({
        version: "3",
        purpose: "AUTHORIZATION",
        resolutionStage: "AUTHORIZED",
        requireActor: true,
      }),
      alias,
    );
    Object.defineProperty(target, aliasKey, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: alias,
    });
    const aliasDescriptor = Object.getOwnPropertyDescriptor(target, aliasKey);
    if (!aliasDescriptor) throw new Error("s2s_v3_receiver_alias_missing");
    GrpcMethod(service, method)(target, aliasKey, aliasDescriptor);
  };
}
