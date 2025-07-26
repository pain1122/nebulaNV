import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma.service';
import { GrpcAuthService } from '../src/auth/grpc/grpc-auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  const grpcAuthMock = {
      getUser: jest.fn(),
      updateProfile: jest.fn(),
  };
  const prismaMock = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtServiceMock = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    jest.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: GrpcAuthService, useValue: grpcAuthMock },
        { provide: PrismaService,  useValue: prismaMock },
        { provide: JwtService,      useValue: jwtServiceMock },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              switch (key) {
                case 'JWT_ACCESS_SECRET':
                case 'JWT_REFRESH_SECRET':
                  return 'test-secret';
                case 'JWT_ACCESS_EXPIRATION':
                case 'JWT_REFRESH_EXPIRATION':
                  return '1h';
                default:
                  return null;
              }
            },
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });


  describe('register', () => {
    it('should hash password and create a user', async () => {
      const email = 'test@example.com';
      const password = 'plainPassword';
      const hashedPassword = 'hashedPassword123';
  
      // Mock bcrypt.hash and prisma.user.create
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      prismaMock.user.create.mockResolvedValue({
        id: '1',
        email,
        password: hashedPassword,
        role: 'user',
      });
  
      const result = await authService.register(email, password);
  
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: { email, password: hashedPassword, role: 'user' },
      });
      expect(result).toEqual({
        id: '1',
        email,
        password: hashedPassword,
        role: 'user',
      });
    });
  });
  


  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'plainPassword';
    const hashedPassword = 'hashedPassword123';
  
    it('should return user if password matches', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        email,
        password: hashedPassword,
        role: 'user',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  
      const result = await authService.validateUser(email, password);
  
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toEqual({
        id: '1',
        email,
        password: hashedPassword,
        role: 'user',
      });
    });
  
    it('should return null if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
  
      const result = await authService.validateUser(email, password);
  
      expect(result).toBeNull();
    });
  
    it('should return null if password does not match', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        email,
        password: hashedPassword,
        role: 'user',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
  
      const result = await authService.validateUser(email, password);
  
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBeNull();
    });
  });
  
  describe('login', () => {
    it('should return both access and refresh tokens and store the refresh hash', async () => {
      const mockUser = { id: '1', email: 'a@b.com', role: 'user' };
  
      // stub the two sign calls
      (jwtServiceMock.sign as jest.Mock)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      // stub bcrypt.hash for the refreshToken
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
  
      const result = await authService.login(mockUser);
  
      // Expect two sign() calls
      expect(jwtServiceMock.sign).toHaveBeenCalledTimes(2);
      // Expect we saved the hashed refresh token in DB
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken: 'hashed-refresh' },
      });
      // And the returned object has both tokens
      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
    });
  });
  

});
