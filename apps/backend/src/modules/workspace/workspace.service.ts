import { createHash, randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InvitationStatus, WorkspaceRole } from "@prisma/client";
import { TokenCryptoService } from "~/common/security/token-crypto.service";
import { PrismaService } from "~/prisma/prisma.service";

export interface WorkspaceContext {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
}

export interface WorkspaceCapabilities {
  canRenameWorkspace: boolean;
  canInviteMembers: boolean;
  canManageInvitations: boolean;
  canChangeMemberRole: boolean;
  canRemoveMembers: boolean;
}

export interface WorkspaceMemberItem {
  id: string;
  email: string;
  role: WorkspaceRole;
  isCurrentUser: boolean;
  joinedAt: Date;
}

export interface WorkspaceInvitationItem {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
}

export interface WorkspaceDetails {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  createdAt: Date;
  ownerEmail: string;
  role: WorkspaceRole;
  capabilities: WorkspaceCapabilities;
  members: WorkspaceMemberItem[];
  invitations: WorkspaceInvitationItem[];
}

export interface UserWorkspaceItem {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: WorkspaceRole;
  isActive: boolean;
}

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenCryptoService: TokenCryptoService
  ) {}

  async ensureDefaultWorkspace(userId: string, email: string): Promise<WorkspaceContext> {
    const existingMembership = await this.prismaService.workspaceMember.findFirst({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" }
    });

    if (existingMembership) {
      await this.prismaService.user.update({
        where: { id: userId },
        data: {
          activeWorkspaceId: existingMembership.workspaceId
        }
      });

      await this.syncSecretVersion(existingMembership.workspaceId, userId);

      return {
        workspaceId: existingMembership.workspaceId,
        workspaceName: existingMembership.workspace.name,
        role: existingMembership.role
      };
    }

    const slugBase = this.slugify(email.split("@")[0] ?? "workspace");
    const workspaceSlug = `${slugBase}-${userId.slice(-6)}`.toLowerCase();
    const workspaceName = `${email.split("@")[0] ?? "Workspace"} Workspace`;

    const activeKey = this.tokenCryptoService.getActiveKeyMetadata();
    const secretHash = this.hashSecret(activeKey.rawSecret);

    const created = await this.prismaService.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug: workspaceSlug,
          ownerId: userId
        }
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceRole.OWNER
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          activeWorkspaceId: workspace.id
        }
      });

      await tx.reportSchedule.createMany({
        data: [
          {
            workspaceId: workspace.id,
            type: "WEEKLY",
            enabled: true,
            dayOfWeek: 1,
            hourUtc: 9,
            minuteUtc: 0
          },
          {
            workspaceId: workspace.id,
            type: "MONTHLY",
            enabled: true,
            dayOfMonth: 1,
            hourUtc: 9,
            minuteUtc: 0
          }
        ],
        skipDuplicates: true
      });

      await tx.secretVersion.create({
        data: {
          workspaceId: workspace.id,
          kid: activeKey.kid,
          materialHash: secretHash,
          isActive: true,
          rotatedByUserId: userId
        }
      });

      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          actorUserId: userId,
          action: "WORKSPACE_CREATED",
          metadata: {
            name: workspace.name,
            slug: workspace.slug
          }
        }
      });

      return workspace;
    });

    return {
      workspaceId: created.id,
      workspaceName: created.name,
      role: WorkspaceRole.OWNER
    };
  }

  async getActiveWorkspaceContext(userId: string, requestedWorkspaceId?: string): Promise<WorkspaceContext> {
    if (requestedWorkspaceId) {
      const membership = await this.prismaService.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: requestedWorkspaceId,
            userId
          }
        },
        include: {
          workspace: true
        }
      });

      if (!membership) {
        throw new NotFoundException("Workspace not found for current user.");
      }

      await this.prismaService.user.update({
        where: { id: userId },
        data: {
          activeWorkspaceId: membership.workspaceId
        }
      });

      return {
        workspaceId: membership.workspaceId,
        workspaceName: membership.workspace.name,
        role: membership.role
      };
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        activeWorkspaceId: true
      }
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if (user.activeWorkspaceId) {
      const activeMembership = await this.prismaService.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: user.activeWorkspaceId,
            userId
          }
        },
        include: {
          workspace: true
        }
      });

      if (activeMembership) {
        return {
          workspaceId: activeMembership.workspaceId,
          workspaceName: activeMembership.workspace.name,
          role: activeMembership.role
        };
      }
    }

    return this.ensureDefaultWorkspace(userId, user.email);
  }

  async assertRole(
    userId: string,
    allowedRoles: WorkspaceRole[],
    requestedWorkspaceId?: string
  ): Promise<WorkspaceContext> {
    const context = await this.getActiveWorkspaceContext(userId, requestedWorkspaceId);
    if (!allowedRoles.includes(context.role)) {
      throw new ForbiddenException("Insufficient workspace role.");
    }
    return context;
  }

  async listUserWorkspaces(userId: string): Promise<UserWorkspaceItem[]> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        activeWorkspaceId: true
      }
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const memberships = await this.prismaService.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: true
      },
      orderBy: [{ createdAt: "asc" }]
    });

    return memberships.map((membership) => ({
      workspaceId: membership.workspaceId,
      workspaceName: membership.workspace.name,
      workspaceSlug: membership.workspace.slug,
      role: membership.role,
      isActive: membership.workspaceId === user.activeWorkspaceId
    }));
  }

  async switchWorkspace(userId: string, workspaceId: string): Promise<WorkspaceContext> {
    return this.getActiveWorkspaceContext(userId, workspaceId);
  }

  async getWorkspaceDetails(userId: string, requestedWorkspaceId?: string): Promise<WorkspaceDetails> {
    const context = await this.getActiveWorkspaceContext(userId, requestedWorkspaceId);
    const capabilities = this.capabilitiesFor(context.role);

    const workspace = await this.prismaService.workspace.findUnique({
      where: { id: context.workspaceId },
      include: {
        owner: {
          select: {
            email: true
          }
        }
      }
    });

    if (!workspace) {
      throw new NotFoundException("Workspace not found.");
    }

    const members = await this.prismaService.workspaceMember.findMany({
      where: {
        workspaceId: context.workspaceId
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }]
    });

    const invitations = capabilities.canManageInvitations
      ? await this.prismaService.workspaceInvitation.findMany({
          where: {
            workspaceId: context.workspaceId
          },
          orderBy: [{ createdAt: "desc" }],
          take: 25
        })
      : [];

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      createdAt: workspace.createdAt,
      ownerEmail: workspace.owner.email,
      role: context.role,
      capabilities,
      members: members.map((member) => ({
        id: member.id,
        email: member.user.email,
        role: member.role,
        isCurrentUser: member.userId === userId,
        joinedAt: member.createdAt
      })),
      invitations: invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt
      }))
    };
  }

  async listWorkspaceMembers(workspaceId: string): Promise<Array<{ email: string; role: WorkspaceRole }>> {
    const members = await this.prismaService.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }]
    });

    return members.map((member) => ({
      email: member.user.email,
      role: member.role
    }));
  }

  async updateWorkspaceName(userId: string, name: string, requestedWorkspaceId?: string): Promise<WorkspaceDetails> {
    const context = await this.getActiveWorkspaceContext(userId, requestedWorkspaceId);
    if (context.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException("Only owner can rename workspace.");
    }

    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 60) {
      throw new BadRequestException("Workspace name must have between 3 and 60 characters.");
    }

    await this.prismaService.workspace.update({
      where: { id: context.workspaceId },
      data: { name: trimmed }
    });

    await this.prismaService.auditLog.create({
      data: {
        workspaceId: context.workspaceId,
        actorUserId: userId,
        action: "WORKSPACE_RENAMED",
        metadata: {
          name: trimmed
        }
      }
    });

    return this.getWorkspaceDetails(userId, context.workspaceId);
  }

  async createInvitation(
    userId: string,
    email: string,
    role: WorkspaceRole,
    requestedWorkspaceId?: string
  ): Promise<WorkspaceInvitationItem> {
    const context = await this.getActiveWorkspaceContext(userId, requestedWorkspaceId);

    if (!this.capabilitiesFor(context.role).canInviteMembers) {
      throw new ForbiddenException("You cannot invite members in this workspace.");
    }

    if (role === WorkspaceRole.OWNER) {
      throw new BadRequestException("Invitations cannot assign OWNER role.");
    }

    if (context.role === WorkspaceRole.EDITOR && role !== WorkspaceRole.VIEWER) {
      throw new ForbiddenException("Editors can only invite VIEWER members.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException("Email is required.");
    }

    const existingMember = await this.prismaService.workspaceMember.findFirst({
      where: {
        workspaceId: context.workspaceId,
        user: {
          email: {
            equals: normalizedEmail,
            mode: "insensitive"
          }
        }
      },
      select: { id: true }
    });

    if (existingMember) {
      throw new ConflictException("This user is already a member of the workspace.");
    }

    const existingInvitation = await this.prismaService.workspaceInvitation.findFirst({
      where: {
        workspaceId: context.workspaceId,
        email: {
          equals: normalizedEmail,
          mode: "insensitive"
        },
        status: InvitationStatus.PENDING
      }
    });

    if (existingInvitation) {
      throw new ConflictException("A pending invitation already exists for this email.");
    }

    const invitation = await this.prismaService.workspaceInvitation.create({
      data: {
        workspaceId: context.workspaceId,
        email: normalizedEmail,
        role,
        token: randomUUID(),
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    await this.prismaService.auditLog.create({
      data: {
        workspaceId: context.workspaceId,
        actorUserId: userId,
        action: "WORKSPACE_INVITATION_CREATED",
        metadata: {
          invitationId: invitation.id,
          email: invitation.email,
          role: invitation.role
        }
      }
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt
    };
  }

  async revokeInvitation(userId: string, invitationId: string, requestedWorkspaceId?: string): Promise<WorkspaceInvitationItem> {
    const context = await this.getActiveWorkspaceContext(userId, requestedWorkspaceId);

    if (!this.capabilitiesFor(context.role).canManageInvitations) {
      throw new ForbiddenException("You cannot revoke invitations in this workspace.");
    }

    const invitation = await this.prismaService.workspaceInvitation.findFirst({
      where: {
        id: invitationId,
        workspaceId: context.workspaceId
      }
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found.");
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException("Only pending invitations can be revoked.");
    }

    const updated = await this.prismaService.workspaceInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.REVOKED
      }
    });

    await this.prismaService.auditLog.create({
      data: {
        workspaceId: context.workspaceId,
        actorUserId: userId,
        action: "WORKSPACE_INVITATION_REVOKED",
        metadata: {
          invitationId: invitation.id
        }
      }
    });

    return {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      expiresAt: updated.expiresAt,
      createdAt: updated.createdAt
    };
  }

  async updateMemberRole(
    userId: string,
    memberId: string,
    role: WorkspaceRole,
    requestedWorkspaceId?: string
  ): Promise<WorkspaceMemberItem> {
    const context = await this.getActiveWorkspaceContext(userId, requestedWorkspaceId);
    if (!this.capabilitiesFor(context.role).canChangeMemberRole) {
      throw new ForbiddenException("You cannot update member roles in this workspace.");
    }

    if (role === WorkspaceRole.OWNER) {
      throw new BadRequestException("Direct OWNER assignment is not supported.");
    }

    const target = await this.prismaService.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId: context.workspaceId
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!target) {
      throw new NotFoundException("Member not found.");
    }

    if (target.role === WorkspaceRole.OWNER || target.userId === userId) {
      throw new ForbiddenException("This member role cannot be changed.");
    }

    const updated = await this.prismaService.workspaceMember.update({
      where: {
        id: target.id
      },
      data: {
        role
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    await this.prismaService.auditLog.create({
      data: {
        workspaceId: context.workspaceId,
        actorUserId: userId,
        action: "WORKSPACE_MEMBER_ROLE_UPDATED",
        metadata: {
          memberId: updated.id,
          email: updated.user.email,
          role: updated.role
        }
      }
    });

    return {
      id: updated.id,
      email: updated.user.email,
      role: updated.role,
      isCurrentUser: updated.userId === userId,
      joinedAt: updated.createdAt
    };
  }

  async removeMember(userId: string, memberId: string, requestedWorkspaceId?: string): Promise<{ removedMemberId: string }> {
    const context = await this.getActiveWorkspaceContext(userId, requestedWorkspaceId);
    if (!this.capabilitiesFor(context.role).canRemoveMembers) {
      throw new ForbiddenException("You cannot remove members in this workspace.");
    }

    const removed = await this.prismaService.$transaction(async (tx) => {
      const target = await tx.workspaceMember.findFirst({
        where: {
          id: memberId,
          workspaceId: context.workspaceId
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              activeWorkspaceId: true
            }
          }
        }
      });

      if (!target) {
        throw new NotFoundException("Member not found.");
      }

      if (target.userId === userId || target.role === WorkspaceRole.OWNER) {
        throw new ForbiddenException("This member cannot be removed.");
      }

      if (context.role === WorkspaceRole.EDITOR && target.role !== WorkspaceRole.VIEWER) {
        throw new ForbiddenException("Editors can only remove VIEWER members.");
      }

      await tx.workspaceMember.delete({
        where: {
          id: target.id
        }
      });

      if (target.user.activeWorkspaceId === context.workspaceId) {
        const fallback = await tx.workspaceMember.findFirst({
          where: {
            userId: target.user.id
          },
          orderBy: [{ createdAt: "asc" }]
        });

        await tx.user.update({
          where: { id: target.user.id },
          data: {
            activeWorkspaceId: fallback?.workspaceId ?? null
          }
        });
      }

      return target;
    });

    await this.prismaService.auditLog.create({
      data: {
        workspaceId: context.workspaceId,
        actorUserId: userId,
        action: "WORKSPACE_MEMBER_REMOVED",
        metadata: {
          memberId: removed.id,
          email: removed.user.email
        }
      }
    });

    return {
      removedMemberId: removed.id
    };
  }

  async syncSecretVersion(workspaceId: string, userId: string): Promise<void> {
    const active = this.tokenCryptoService.getActiveKeyMetadata();
    const materialHash = this.hashSecret(active.rawSecret);

    const existing = await this.prismaService.secretVersion.findFirst({
      where: {
        workspaceId,
        kid: active.kid
      }
    });

    if (existing) {
      if (!existing.isActive || existing.materialHash !== materialHash) {
        await this.prismaService.secretVersion.updateMany({
          where: {
            workspaceId,
            isActive: true
          },
          data: {
            isActive: false
          }
        });

        await this.prismaService.secretVersion.update({
          where: {
            id: existing.id
          },
          data: {
            isActive: true,
            materialHash,
            rotatedByUserId: userId
          }
        });

        await this.prismaService.auditLog.create({
          data: {
            workspaceId,
            actorUserId: userId,
            action: "SECRET_ROTATED",
            metadata: { kid: active.kid }
          }
        });
      }

      return;
    }

    await this.prismaService.secretVersion.updateMany({
      where: {
        workspaceId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    await this.prismaService.secretVersion.create({
      data: {
        workspaceId,
        kid: active.kid,
        materialHash,
        isActive: true,
        rotatedByUserId: userId
      }
    });

    await this.prismaService.auditLog.create({
      data: {
        workspaceId,
        actorUserId: userId,
        action: "SECRET_ROTATED",
        metadata: { kid: active.kid }
      }
    });
  }

  private capabilitiesFor(role: WorkspaceRole): WorkspaceCapabilities {
    if (role === WorkspaceRole.OWNER) {
      return {
        canRenameWorkspace: true,
        canInviteMembers: true,
        canManageInvitations: true,
        canChangeMemberRole: true,
        canRemoveMembers: true
      };
    }

    if (role === WorkspaceRole.EDITOR) {
      return {
        canRenameWorkspace: false,
        canInviteMembers: true,
        canManageInvitations: true,
        canChangeMemberRole: false,
        canRemoveMembers: true
      };
    }

    return {
      canRenameWorkspace: false,
      canInviteMembers: false,
      canManageInvitations: false,
      canChangeMemberRole: false,
      canRemoveMembers: false
    };
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace";
  }

  private hashSecret(secret: string): string {
    return createHash("sha256").update(secret).digest("hex");
  }
}
