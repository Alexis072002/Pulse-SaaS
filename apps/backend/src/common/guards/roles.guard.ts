import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { WorkspaceRole } from "@prisma/client";
import { IS_PUBLIC_KEY } from "~/common/decorators/public.decorator";
import { ROLES_KEY } from "~/common/decorators/roles.decorator";
import { WorkspaceService } from "~/modules/workspace/workspace.service";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspaceService: WorkspaceService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { id?: string };
      headers?: Record<string, string | string[] | undefined>;
      query?: Record<string, string | undefined>;
      workspace?: {
        workspaceId: string;
        role: WorkspaceRole;
      };
    }>();

    const userId = request.user?.id;
    if (!userId) {
      throw new ForbiddenException("Workspace role validation requires an authenticated user.");
    }

    const requestedWorkspaceId = this.extractWorkspaceId(request);
    const workspace = await this.workspaceService.getActiveWorkspaceContext(userId, requestedWorkspaceId);

    if (!requiredRoles.includes(workspace.role)) {
      throw new ForbiddenException("Insufficient role for this action.");
    }

    request.workspace = {
      workspaceId: workspace.workspaceId,
      role: workspace.role
    };

    return true;
  }

  private extractWorkspaceId(request: {
    headers?: Record<string, string | string[] | undefined>;
    query?: Record<string, string | undefined>;
  }): string | undefined {
    const headerValue = request.headers?.["x-workspace-id"];
    if (typeof headerValue === "string" && headerValue.trim().length > 0) {
      return headerValue.trim();
    }
    if (Array.isArray(headerValue) && headerValue[0] && headerValue[0].trim().length > 0) {
      return headerValue[0].trim();
    }

    const queryValue = request.query?.workspaceId;
    if (typeof queryValue === "string" && queryValue.trim().length > 0) {
      return queryValue.trim();
    }

    return undefined;
  }
}
