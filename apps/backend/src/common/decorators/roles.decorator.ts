import { SetMetadata } from "@nestjs/common";
import { WorkspaceRole } from "@prisma/client";

export const ROLES_KEY = "required_workspace_roles";
export const Roles = (...roles: WorkspaceRole[]): ReturnType<typeof SetMetadata> => SetMetadata(ROLES_KEY, roles);
