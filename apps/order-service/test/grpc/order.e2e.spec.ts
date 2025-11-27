// apps/order-service/test/grpc/order.e2e.spec.ts
import * as grpc from "@grpc/grpc-js"
import {randomUUID} from "crypto"
import {call, loadClient, mdS2S} from "./helpers"
import {httpJson} from "../utils/http"

const ORDER_GRPC = process.env.ORDER_GRPC_URL || "127.0.0.1:50056"
const ORDER_PROTO = require.resolve("@nebula/protos/order.proto")
const AUTH_HTTP = process.env.AUTH_HTTP_URL!
const PRODUCT_HTTP = process.env.PRODUCT_HTTP_URL!

type LoginResp = { accessToken: string }; 

type OrderClient = grpc.Client & {
  GetCart: (req: any, md: grpc.Metadata, cb: Function) => void
  AddToCart: (req: any, md: grpc.Metadata, cb: Function) => void
  UpdateCartItem: (req: any, md: grpc.Metadata, cb: Function) => void
  RemoveCartItem: (req: any, md: grpc.Metadata, cb: Function) => void
  Checkout: (req: any, md: grpc.Metadata, cb: Function) => void
  GetOrder: (req: any, md: grpc.Metadata, cb: Function) => void
  ListOrders: (req: any, md: grpc.Metadata, cb: Function) => void
  UpdateOrderStatus: (req: any, md: grpc.Metadata, cb: Function) => void
}


describe("OrderService gRPC (cart + checkout + orders)", () => {
  let client: OrderClient
  const userId = randomUUID()
  let orderId: string
  let cartItemId: string
  let productId: string
  let adminToken: string

  beforeAll(async () => {
    client = loadClient<OrderClient>(ORDER_PROTO, "order", "OrderService", ORDER_GRPC)

    // admin login for product creation
    const a = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
    })
    adminToken = a.accessToken

    // create product via product-service HTTP
    const p = await httpJson<any>("POST", `${PRODUCT_HTTP}/products`, {data: {title: "OrderSvc gRPC Product", price: 99.99}}, {authorization: `Bearer ${adminToken}`})
    productId = p.data.id
  })

  it("GetCart returns an empty cart for a new user", async () => {
    const res = await call<any>(client, "GetCart", {userId}, mdS2S({svc: "order-service"}))
    expect(res.data).toBeTruthy()
    expect(res.data.userId).toBe(userId)
    expect(Array.isArray(res.data.items)).toBe(true)
  })

  it("AddToCart adds an item", async () => {
    const res = await call<any>(client, "AddToCart", {userId, productId, quantity: 2}, mdS2S({svc: "order-service"}))

    expect(res.data).toBeTruthy()
    expect(res.data.items.length).toBeGreaterThan(0)
    const item = res.data.items[0]
    expect(item.productId).toBe(productId)
    expect(item.quantity).toBe(2)
    cartItemId = item.id
  })

  it("UpdateCartItem changes quantity", async () => {
    const res = await call<any>(client, "UpdateCartItem", {userId, itemId: cartItemId, quantity: 3}, mdS2S({svc: "order-service"}))

    const item = res.data.items.find((i: any) => i.id === cartItemId)
    expect(item).toBeTruthy()
    expect(item.quantity).toBe(3)
  })

  it("Checkout creates an order and empties cart", async () => {
    const res = await call<any>(client, "Checkout", {userId, note: "gRPC checkout"}, mdS2S({svc: "order-service"}))

    expect(res.data).toBeTruthy()
    expect(res.data.id).toBeTruthy()
    expect(res.data.userId).toBe(userId)
    expect(res.data.items.length).toBeGreaterThan(0)

    orderId = res.data.id

    // cart should be empty now
    const cart = await call<any>(client, "GetCart", {userId}, mdS2S({svc: "order-service"}))
    expect(cart.data.items.length).toBe(0)
  })

  it("ListOrders contains the created order", async () => {
    const res = await call<any>(client, "ListOrders", {userId}, mdS2S({svc: "order-service"}))

    expect(res.data.length).toBeGreaterThan(0)
    const hit = res.data.find((o: any) => o.id === orderId)
    expect(!!hit).toBe(true)
  })

  it("GetOrder returns the created order", async () => {
    const res = await call<any>(client, "GetOrder", {userId, id: orderId}, mdS2S({svc: "order-service"}))

    expect(res.data.id).toBe(orderId)
    expect(res.data.userId).toBe(userId)
    expect(res.data.items.length).toBeGreaterThan(0)
  })

  it("UpdateOrderStatus changes status to PAID (admin S2S)", async () => {
    const res = await call<any>(client, "UpdateOrderStatus", {id: orderId, status: "PAID"}, mdS2S({svc: "order-service", role: "admin"}))

    expect(res.data.id).toBe(orderId)
    expect(res.data.status).toBe("PAID")
  })
})
