export type WorkspaceRole = "OWNER" | "EDITOR" | "VIEWER";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

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
  joinedAt: string;
}

export interface WorkspaceInvitationItem {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceDetails {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  createdAt: string;
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
