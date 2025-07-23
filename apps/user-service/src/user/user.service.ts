import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../prisma/generated/client';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';

type User = Prisma.UserGetPayload<{}>;

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async createUser(email: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { email, password: hashedPassword, role: 'user' },
    });
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
  
    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? user : null;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
  
    const dataToUpdate: Partial<{ email: string; password: string }> = {};
  
    // Handle password change if requested
    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Current password is required to change password',
        );
      }
      // **capture** currentPassword into a local const
      const currentPassword = dto.currentPassword;
      const passwordMatches = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!passwordMatches) {
        throw new BadRequestException('Current password is incorrect');
      }
      dataToUpdate.password = await bcrypt.hash(dto.newPassword, 10);
    }
  
    // Handle email update
    if (dto.email) {
      dataToUpdate.email = dto.email;
    }
  
    if (Object.keys(dataToUpdate).length === 0) {
      return user;
    }
  
    return this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });
  }
}
