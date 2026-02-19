import { Injectable } from "@nestjs/common";
import { AuditActorType, Prisma } from "@prisma/client";
import { PrismaService } from "~/prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prismaService: PrismaService) {}

  async logUserAction(
    workspaceId: string,
    actorUserId: string,
    action: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.prismaService.auditLog.create({
      data: {
        workspaceId,
        actorUserId,
        actorType: AuditActorType.USER,
        action,
        metadata: metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async logSystemAction(
    workspaceId: string,
    action: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.prismaService.auditLog.create({
      data: {
        workspaceId,
        actorType: AuditActorType.SYSTEM,
        action,
        metadata: metadata as Prisma.InputJsonValue | undefined
      }
    });
  }
}
