import {Test} from "@nestjs/testing"
import {SettingsGrpcController} from "../src/grpc/settings-grpc.controller"
import {SettingsService} from "../src/settings.service"

describe("SettingsGrpcController", () => {
  let controller
  let service

  beforeEach(async () => {
    jest.clearAllMocks()

    service = {getString: jest.fn(), setString: jest.fn()}
    const moduleRef = await Test.createTestingModule({
      providers: [{provide: SettingsService, useValue: service}],
      controllers: [SettingsGrpcController],
    }).compile()

    controller = moduleRef.get(SettingsGrpcController)
    service = moduleRef.get(SettingsService)
  })

  it("Testing the async 'GetString' to see if it returns any value and the found flag", async () => {
    service.getString.mockResolvedValue({value: "found it", found: true})
    const res = await controller.GetString({namespace: "language", key: "test"})
    expect(service.getString).toHaveBeenCalledWith("language", "test", "default")
    expect(res).toEqual({value: "found it", found: true})
  })
  it("Testing the async 'SetString' to see if it sets/updates a row and returns its value", async () => {
    service.setString.mockResolvedValue({value: "injected/updated"})
    const res = await controller.SetString({namespace: "eng", key: "site_title", value: "welcome"})
    expect(service.setString).toHaveBeenCalledWith("eng", "site_title", "welcome", "default")
    expect(res).toEqual({value: "injected/updated"})
  })
  it("should send error when service.getString rejects", async () => {
    service.getString.mockRejectedValue(new Error("getString failure"))
    await expect(controller.GetString({namespace: "ui", key: "theme_color"})).rejects.toThrow("getString failure")
    expect(service.getString).toHaveBeenCalledWith("ui", "theme_color", "default")
  })
  it("should send error when service.setString rejects", async () => {
    service.setString.mockRejectedValue(new Error("setString failure"))
    await expect(controller.SetString({namespace: "eng", key: "site_title", value: "welcome"})).rejects.toThrow("setString failure")
    expect(service.setString).toHaveBeenCalledWith("eng", "site_title", "welcome", "default")
  })
  it("checks the valid response of getString", async () => {
    service.getString.mockResolvedValue({ value: "", found: false})
    const res = await controller.GetString({ namespace: "ui", key: "theme_color" })
    expect(service.getString).toHaveBeenCalledWith("ui", "theme_color", "default")
    expect(res).toEqual({ value: "", found: false })
  })
})
