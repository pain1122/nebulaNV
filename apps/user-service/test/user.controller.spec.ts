import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../src/user/user.controller';
import { UserService } from '../src/user/user.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { UpdateProfileDto } from '../src/dto/update-profile.dto';
import type { ReqUser as ReqUserType } from '../src/common/decorators/req-user.decorator';

describe('UserController', () => {
  let controller: UserController;

  // Keep mocks wide: no generic types, no parameter shapes → no TS2322
  let userService: {
    getAllUsers: jest.Mock<any>;
    getUserById: jest.Mock<any>;
    updateProfile: jest.Mock<any>;
  };

  // Make a ReqUser object that satisfies your exported type
  const makeReqUser = (
    overrides: Partial<ReqUserType> = {}
  ): ReqUserType =>
    ({
      userId: 'u1',
      role: 'user',
      email: 'u1@example.com',
      ...overrides,
    } as ReqUserType);

  beforeEach(async () => {
    userService = {
      getAllUsers: jest.fn(async (..._args: any[]) => [{ id: '1' }, { id: '2' }]),
      getUserById: jest.fn(async (...args: any[]) => {
        const id = args[0];
        return { id, email: 'u@x.com', role: 'user' };
      }),
      updateProfile: jest.fn(async (...args: any[]) => {
        const [id, dto] = args;
        return { id, ...dto };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: userService }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  describe('GET /users', () => {
    it('returns all users (decorators/guards don’t run in unit tests)', async () => {
      userService.getAllUsers.mockImplementationOnce(async () => [{ id: '1' }, { id: '2' }]);

      const result = await controller.getAllUsers();

      expect(userService.getAllUsers).toHaveBeenCalled();
      expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    });
  });

  describe('GET /users/:id', () => {
    const mockUser = { id: 'u2', email: 'other@x.com', role: 'user' };

    it('allows self access', async () => {
      userService.getUserById.mockImplementationOnce(async () => ({ id: 'u1', email: 'me@x.com' }));

      const result = await controller.findOne('u1', makeReqUser());

      expect(userService.getUserById).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ id: 'u1', email: 'me@x.com' });
    });

    it('allows admin to access others', async () => {
      userService.getUserById.mockImplementationOnce(async () => mockUser);

      const result = await controller.findOne('u2', makeReqUser({ role: 'admin' }));

      expect(userService.getUserById).toHaveBeenCalledWith('u2');
      expect(result).toEqual(mockUser);
    });

    it('denies non-admin accessing others', async () => {
      userService.getUserById.mockImplementationOnce(async () => mockUser);

      await expect(controller.findOne('u2', makeReqUser({ role: 'user' })))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
