import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ROLES_KEY, Roles } from '../src/common/decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createContext(userRole: string | undefined, rolesMeta: string[] | undefined): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: userRole ? { role: userRole } : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access when no requiredRoles metadata is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createContext('user', undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user role is included in requiredRoles metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'supervisor']);

    const context = createContext('admin', ['admin', 'supervisor']);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user role is not included in requiredRoles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'supervisor']);

    const context = createContext('user', ['admin', 'supervisor']);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is undefined', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = createContext(undefined, ['admin']);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException in production if no roles metadata is found', () => {
    process.env.NODE_ENV = 'production';
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
  
    const context = createContext('admin', undefined);
  
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    
    delete process.env.NODE_ENV;
  });
  
  it('should allow access and log warning in development if no roles metadata is found', () => {
    process.env.NODE_ENV = 'development';
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    
    const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  
    const context = createContext('admin', undefined);
  
    expect(guard.canActivate(context)).toBe(true);
    expect(loggerWarnSpy).toHaveBeenCalled();
  
    loggerWarnSpy.mockRestore();
    
    delete process.env.NODE_ENV;
  });
  
});
