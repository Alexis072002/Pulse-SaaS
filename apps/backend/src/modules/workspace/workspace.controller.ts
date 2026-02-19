import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { InvitationStatus, WorkspaceRole } from "@prisma/client";
import { CurrentUser } from "~/common/decorators/current-user.decorator";
import { Roles } from "~/common/decorators/roles.decorator";
import { RouteRateLimit } from "~/common/decorators/route-rate-limit.decorator";
import { CreateWorkspaceInvitationDto } from "~/modules/workspace/dto/create-workspace-invitation.dto";
import { SwitchWorkspaceDto } from "~/modules/workspace/dto/switch-workspace.dto";
import { UpdateWorkspaceMemberRoleDto } from "~/modules/workspace/dto/update-workspace-member-role.dto";
import { UpdateWorkspaceNameDto } from "~/modules/workspace/dto/update-workspace-name.dto";
import { WorkspaceService } from "~/modules/workspace/workspace.service";

interface WorkspaceContextResponse {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  createdAt: Date;
  ownerEmail: string;
  role: WorkspaceRole;
  capabilities: {
    canRenameWorkspace: boolean;
    canInviteMembers: boolean;
    canManageInvitations: boolean;
    canChangeMemberRole: boolean;
    canRemoveMembers: boolean;
  };
  members: Array<{
    id: string;
    email: string;
    role: WorkspaceRole;
    isCurrentUser: boolean;
    joinedAt: Date;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: WorkspaceRole;
    status: InvitationStatus;
    expiresAt: Date;
    createdAt: Date;
  }>;
}

@Controller("workspace")
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get("context")
  async getContext(
    @CurrentUser() user: { id: string },
    @Query("workspaceId") workspaceId?: string
  ): Promise<WorkspaceContextResponse> {
    return this.workspaceService.getWorkspaceDetails(user.id, workspaceId);
  }

  @Get("list")
  async listUserWorkspaces(@CurrentUser() user: { id: string }): Promise<Array<{
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    role: WorkspaceRole;
    isActive: boolean;
  }>> {
    return this.workspaceService.listUserWorkspaces(user.id);
  }

  @Post("switch")
  @RouteRateLimit({ limit: 30, windowMs: 60_000 })
  async switchWorkspace(
    @CurrentUser() user: { id: string },
    @Body() body: SwitchWorkspaceDto
  ): Promise<{ workspaceId: string; workspaceName: string; role: WorkspaceRole }> {
    return this.workspaceService.switchWorkspace(user.id, body.workspaceId);
  }

  @Patch("name")
  @Roles(WorkspaceRole.OWNER)
  @RouteRateLimit({ limit: 20, windowMs: 60_000 })
  async renameWorkspace(
    @CurrentUser() user: { id: string },
    @Body() body: UpdateWorkspaceNameDto,
    @Query("workspaceId") workspaceId?: string
  ): Promise<WorkspaceContextResponse> {
    return this.workspaceService.updateWorkspaceName(user.id, body.name, workspaceId);
  }

  @Post("invitations")
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.EDITOR)
  @RouteRateLimit({ limit: 20, windowMs: 60_000 })
  async inviteMember(
    @CurrentUser() user: { id: string },
    @Body() body: CreateWorkspaceInvitationDto,
    @Query("workspaceId") workspaceId?: string
  ): Promise<{
    id: string;
    email: string;
    role: WorkspaceRole;
    status: InvitationStatus;
    expiresAt: Date;
    createdAt: Date;
  }> {
    return this.workspaceService.createInvitation(user.id, body.email, body.role, workspaceId);
  }

  @Delete("invitations/:invitationId")
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.EDITOR)
  @RouteRateLimit({ limit: 30, windowMs: 60_000 })
  async revokeInvitation(
    @CurrentUser() user: { id: string },
    @Param("invitationId") invitationId: string,
    @Query("workspaceId") workspaceId?: string
  ): Promise<{
    id: string;
    email: string;
    role: WorkspaceRole;
    status: InvitationStatus;
    expiresAt: Date;
    createdAt: Date;
  }> {
    return this.workspaceService.revokeInvitation(user.id, invitationId, workspaceId);
  }

  @Patch("members/:memberId/role")
  @Roles(WorkspaceRole.OWNER)
  @RouteRateLimit({ limit: 30, windowMs: 60_000 })
  async updateMemberRole(
    @CurrentUser() user: { id: string },
    @Param("memberId") memberId: string,
    @Body() body: UpdateWorkspaceMemberRoleDto,
    @Query("workspaceId") workspaceId?: string
  ): Promise<{
    id: string;
    email: string;
    role: WorkspaceRole;
    isCurrentUser: boolean;
    joinedAt: Date;
  }> {
    return this.workspaceService.updateMemberRole(user.id, memberId, body.role, workspaceId);
  }

  @Delete("members/:memberId")
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.EDITOR)
  @RouteRateLimit({ limit: 20, windowMs: 60_000 })
  async removeMember(
    @CurrentUser() user: { id: string },
    @Param("memberId") memberId: string,
    @Query("workspaceId") workspaceId?: string
  ): Promise<{ removedMemberId: string }> {
    return this.workspaceService.removeMember(user.id, memberId, workspaceId);
  }
}
