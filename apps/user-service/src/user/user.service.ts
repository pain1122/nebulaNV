import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../prisma/generated/client';
import { UpdateProfileDto } from '../dto/update-profile.dto';

type User = Prisma.UserGetPayload<{}>;

function mapPrisma(e: any) {
  if (e?.code === 'P2002')
    return new BadRequestException('Email already in use');
  return e;
}

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async createUser(email: string, password: string): Promise<User> {
    const e = email.trim().toLowerCase();
    const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
    const hashedPassword = await bcrypt.hash(password, rounds);
    try {
      return this.prisma.user.create({
        data: { email: e, password: hashedPassword, role: 'user' },
      });
    } catch (err) {
      throw mapPrisma(err);
    }
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const e = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: e } });
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
        phone: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const dataToUpdate: Partial<{ email: string; password: string }> = {};
    try {
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
        const nextEmail = dto.email.trim().toLowerCase();
        if (nextEmail !== user.email) {
          // optional: ensure not taken
          const dup = await this.prisma.user.findUnique({
            where: { email: nextEmail },
            select: { id: true },
          });
          if (dup && dup.id !== userId)
            throw new BadRequestException('Email already in use');
          dataToUpdate.email = nextEmail;
        }
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return user;
      }

      return this.prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
      });
    } catch (err) {
      throw mapPrisma(err);
    }
  }

  async getUserByEmail(email: string) {
    const e = email.trim().toLowerCase();
    return this.prisma.user.findUnique({ where: { email: e } });
  }
  async getUserByPhone(phone: string) {
    const p = phone.replace(/\D+/g, '');
    return this.prisma.user.findUnique({ where: { phone: p } });
  }

  async createUserWithHash(email: string, passwordHash: string, role: string) {
    const e = email.trim().toLowerCase();
    try {
      return this.prisma.user.create({
        data: { email: e, password: passwordHash, role },
      });
    } catch (err) {
      throw mapPrisma(err);
    }
  }

  async setRefreshToken(userId: string, refreshToken: string | null) {
    const next =
      refreshToken && refreshToken.trim().length > 0 ? refreshToken : null;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: next },
      select: { id: true, email: true, role: true },
    });

    return {
      id: updated.id,
      email: updated.email ?? '',
      role: updated.role,
    };
  }
}
