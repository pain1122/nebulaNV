import { Module } from "@nestjs/common";
import { BlogService } from "./blog.service";
import { BlogController } from "./blog.controller";
import { PrismaService } from "../prisma.service";
import { BlogGrpcController } from "./grpc/blog-grpc.controller";

@Module({
  controllers: [BlogController, BlogGrpcController],
  providers: [BlogService, PrismaService],
})
export class BlogModule {}
