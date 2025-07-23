// Import Nest testing utilities and types
import { Test, TestingModule } from '@nestjs/testing';
// Import the controller under test
import { UserController } from '../src/user/user.controller';
// Import the service to be mocked
import { UserService } from '../src/user/user.service';
// Import exceptions used by controller logic
import { ForbiddenException, BadRequestException } from '@nestjs/common';
// Import DTO for profile updates
import { UpdateProfileDto } from '../src/auth/dto/update-profile.dto';

// Describe the test suite for the UserController
describe('UserController', () => {
  // Controller instance to be tested
  let controller: UserController;
  // Partial mock of UserService with jest.Mock methods
  let userService: Partial<Record<keyof UserService, jest.Mock>>;

  // Setup before each test case
  beforeEach(async () => {
    // Create mock implementations for service methods
    userService = {
      getUserById: jest.fn(),    // mock for fetching single user
      getAllUsers: jest.fn(),    // mock for fetching all users
      updateProfile: jest.fn(),  // mock for updating user profile
    };

    // Build a testing module with the controller and mocked service
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: userService }],
    }).compile(); // compile() resolves dependencies

    // Retrieve the controller instance from the testing module
    controller = module.get<UserController>(UserController);
  });

  // Test suite for GET /users/:id endpoint
  describe('GET /users/:id', () => {
    // Sample user data returned by the mock
    const mockUser = { id: '123', email: 'test@example.com', role: 'user' };

    it('should allow user to access their own profile', async () => {
      // Arrange: stub getUserById to resolve to mockUser
      userService.getUserById!.mockResolvedValue(mockUser);
      // Create a fake request object with the same userId
      const req = { user: { userId: '123', role: 'user' } } as any;

      // Act: call the controller method
      const result = await controller.findOne('123', req);

      // Assert: service called with correct argument
      expect(userService.getUserById).toHaveBeenCalledWith('123');
      // Assert: controller returns the mock user
      expect(result).toEqual(mockUser);
    });

    it('should allow admin to access other profiles', async () => {
      // Arrange: stub getUserById to resolve to mockUser
      userService.getUserById!.mockResolvedValue(mockUser);
      // Fake request with an admin role
      const req = { user: { userId: '999', role: 'admin' } } as any;

      // Act: call controller
      const result = await controller.findOne('123', req);

      // Assert: service called correctly
      expect(userService.getUserById).toHaveBeenCalledWith('123');
      // Assert: returns the mock user
      expect(result).toEqual(mockUser);
    });

    it('should deny non-admin user trying to access others', async () => {
      // Arrange: stub getUserById just in case
      userService.getUserById!.mockResolvedValue(mockUser);
      // Fake request for a different non-admin user
      const req = { user: { userId: '999', role: 'user' } } as any;

      // Act & Assert: expect ForbiddenException to be thrown
      await expect(controller.findOne('123', req)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // Test suite for GET /users endpoint
  describe('GET /users', () => {
    it('should allow admin to get all users', async () => {
      // Arrange: stub getAllUsers to resolve an array
      const users = [{ id: '1' }, { id: '2' }];
      userService.getAllUsers!.mockResolvedValue(users);

      // Act: call the controller method
      const result = await controller.getAllUsers();

      // Assert: returns the stubbed users array
      expect(result).toEqual(users);
    });
  });

  // Test suite for PUT /users/me endpoint
  describe('PUT /users/me', () => {
    // Prepare a DTO for email-only update
    const dto: UpdateProfileDto = { email: 'new@example.com' };
    // Expected output from the updateProfile mock
    const updatedUser = { id: '123', email: 'new@example.com', role: 'user' };

    it('should update email-only profile successfully', async () => {
      // Arrange: stub updateProfile to resolve to updatedUser
      userService.updateProfile!.mockResolvedValue(updatedUser);
      // Fake request with the correct userId
      const req = { user: { userId: '123', role: 'user' } } as any;

      // Act: call the controller method
      const result = await controller.updateProfile(req, dto);

      // Assert: service invoked with userId and DTO
      expect(userService.updateProfile).toHaveBeenCalledWith('123', dto);
      // Assert: controller returns the updated user object
      expect(result).toEqual(updatedUser);
    });

    it('should propagate BadRequestException on invalid input', async () => {
      // Arrange: stub updateProfile to reject with BadRequestException
      userService.updateProfile!.mockRejectedValue(
        new BadRequestException('Invalid currentPassword'),
      );
      // Fake request remains the same
      const req = { user: { userId: '123', role: 'user' } } as any;

      // Act & Assert: expect controller to throw the same exception
      await expect(controller.updateProfile(req, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
