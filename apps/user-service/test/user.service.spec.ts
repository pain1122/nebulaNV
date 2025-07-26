import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserService } from '../src/user/user.service';
import { PrismaService } from '../src/prisma.service';

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
  }));

describe('UserService', () => {
  let userService: UserService;
  const prismaServiceMock = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
  });

  describe('createUser', () => {
    it('should hash password and create user', async () => {
      const email = 'test@example.com';
      const password = 'plainPassword';
      const hashedPassword = 'hashedPassword123';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      prismaServiceMock.user.create.mockResolvedValue({ id: '1', email, password: hashedPassword, role: 'user' });

      const user = await userService.createUser(email, password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(prismaServiceMock.user.create).toHaveBeenCalledWith({
        data: { email, password: hashedPassword, role: 'user' },
      });
      expect(user).toEqual({ id: '1', email, password: hashedPassword, role: 'user' });
    });
  });
  describe('validateUser', () => {
    it('should return the user if email and password match', async () => {
      const email = 'test@example.com';
      const password = 'plainPassword';
      const hashedPassword = 'hashedPassword123';
  
      // Mock prisma to find the user with the hashed password
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: '1',
        email,
        password: hashedPassword,
        role: 'user',
      });
  
      // Mock bcrypt.compare to return true (passwords match)
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  
      const user = await userService.validateUser(email, password);
  
      expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(user).toEqual({
        id: '1',
        email,
        password: hashedPassword,
        role: 'user',
      });
    });
  
    it('should return null if user is not found', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(null);
  
      const user = await userService.validateUser('notfound@example.com', 'somePassword');
  
      expect(user).toBeNull();
      expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'notfound@example.com' } });
    });
  
    it('should return null if password does not match', async () => {
      const email = 'test@example.com';
      const hashedPassword = 'hashedPassword123';
  
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: '1',
        email,
        password: hashedPassword,
        role: 'user',
      });
  
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
  
      const user = await userService.validateUser(email, 'wrongPassword');
  
      expect(user).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongPassword', hashedPassword);
    });
  });

  describe('getUserById', () => {
    it('should return a user when found', async () => {
      const userId = '123';
      const expectedUser = { id: userId, email: 'user@example.com', role: 'user' };
  
      prismaServiceMock.user.findUnique.mockResolvedValue(expectedUser);
  
      const user = await userService.getUserById(userId);
  
      expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({ where: { id: userId } });
      expect(user).toEqual(expectedUser);
    });
  
    it('should return null if user not found', async () => {
      const userId = '456';
  
      prismaServiceMock.user.findUnique.mockResolvedValue(null);
  
      const user = await userService.getUserById(userId);
  
      expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({ where: { id: userId } });
      expect(user).toBeNull();
    });
  });
  describe('getAllUsers', () => {
    it('should return all users with selected fields', async () => {
      const users = [
        { id: '1', email: 'user1@example.com', phone: '+1234567890', role: 'user', createdAt: new Date() },
        { id: '2', email: 'user2@example.com', phone: '+1234567890', role: 'admin', createdAt: new Date() },
      ];
  
      prismaServiceMock.user.findMany.mockResolvedValue(users);
  
      const result = await userService.getAllUsers();
  
      expect(prismaServiceMock.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });
  
      expect(result).toEqual(users);
    });
  });
  
  
});
