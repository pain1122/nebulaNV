import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
const prisma = new PrismaService();

@Injectable()
export class AppService {
  constructor(private config: ConfigService) {}



  getHello(): string {
    const port = this.config.get<number>('PORT');
    return `Hello, Nebula on port ${port}!`;
  }
}
