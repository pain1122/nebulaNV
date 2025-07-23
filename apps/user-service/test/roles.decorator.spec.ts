import { Reflector } from '@nestjs/core';
import { Roles, ROLES_KEY } from '../src/common/decorators/roles.decorator';

describe('Roles Decorator', () => {
  it('should set roles metadata correctly on a method', () => {
    class TestClass {
      @Roles('admin', 'supervisor')
      testMethod() {}
    }

    const reflector = new Reflector();
    const metadata = Reflect.getMetadata(ROLES_KEY, TestClass.prototype.testMethod);

    expect(metadata).toEqual(['admin', 'supervisor']);
  });
});
