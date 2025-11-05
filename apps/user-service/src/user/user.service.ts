import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../prisma/generated/client';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { toRpc, fromRpcToHttp, wrapGrpc } from '@nebula/grpc-auth';
import { status } from '@grpc/grpc-js';

type User = Prisma.UserGetPayload<{}>;

function mapPrisma(e: any) {
  if (e?.code === 'P2002')
    return new BadRequestException('Email already in use');
  return e;
}

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // -------------------------------------------------------------------
  // Helper: validate user ownership or role
  // -------------------------------------------------------------------
  private assertSelfOrAdmin(ctxUser: any, targetId: string) {
    if (!ctxUser)
      throw toRpc(status.UNAUTHENTICATED, 'Missing user context');
    const isSelf = ctxUser.userId === targetId;
    const isAdmin = ['admin', 'root-admin'].includes(ctxUser.role);
    if (!isSelf && !isAdmin)
      throw toRpc(status.PERMISSION_DENIED, 'Access denied');
  }

  // -------------------------------------------------------------------
  // Create user (frontend register)
  // -------------------------------------------------------------------
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

  // -------------------------------------------------------------------
  // Login validation
  // -------------------------------------------------------------------
  async validateUser(email: string, password: string): Promise<User | null> {
    const e = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: e } });
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? user : null;
  }

  // -------------------------------------------------------------------
  // Get user by ID (self or admin)
  // -------------------------------------------------------------------
  async getUserById(id: string, ctxUser?: { userId: string; role: string }): Promise<User | null> {
    if (ctxUser) this.assertSelfOrAdmin(ctxUser, id);
    return this.prisma.user.findUnique({ where: { id } });
  }

  // -------------------------------------------------------------------
  // Get all users (admin only)
  // -------------------------------------------------------------------
  async getAllUsers(ctxUser?: { role: string }) {
    if (!ctxUser || !['admin', 'root-admin'].includes(ctxUser.role))
      throw new ForbiddenException('Admin access required');

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

  // -------------------------------------------------------------------
  // Update profile (self or admin)
  // -------------------------------------------------------------------
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    ctxUser?: { userId: string; role: string },
  ): Promise<User> {
    if (ctxUser) this.assertSelfOrAdmin(ctxUser, userId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const dataToUpdate: Partial<{ email: string; password: string }> = {};
    try {
      // Handle password change if requested
      if (dto.newPassword) {
        if (!dto.currentPassword)
          throw new BadRequestException('Current password is required');
        const passwordMatches = await bcrypt.compare(
          dto.currentPassword,
          user.password,
        );
        if (!passwordMatches)
          throw new BadRequestException('Current password is incorrect');

        dataToUpdate.password = await bcrypt.hash(dto.newPassword, 10);
      }

      // Handle email update
      if (dto.email) {
        const nextEmail = dto.email.trim().toLowerCase();
        if (nextEmail !== user.email) {
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

  // -------------------------------------------------------------------
  // Lookup helpers
  // -------------------------------------------------------------------
  async getUserByEmail(email: string) {
    const e = email.trim().toLowerCase();
    return this.prisma.user.findUnique({ where: { email: e } });
  }

  async getUserByPhone(phone: string) {
    const p = phone.replace(/\D+/g, '');
    return this.prisma.user.findUnique({ where: { phone: p } });
  }

  // -------------------------------------------------------------------
  // Create with pre-hashed password (used by auth-service)
  // -------------------------------------------------------------------
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

  // -------------------------------------------------------------------
  // Refresh token management
  // -------------------------------------------------------------------
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
