import { Module } from "@nestjs/common";
import { TokenCryptoService } from "~/common/security/token-crypto.service";
import { WorkspaceController } from "~/modules/workspace/workspace.controller";
import { WorkspaceService } from "~/modules/workspace/workspace.service";
import { PrismaService } from "~/prisma/prisma.service";

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService, PrismaService, TokenCryptoService],
  exports: [WorkspaceService]
})
export class WorkspaceModule {}
