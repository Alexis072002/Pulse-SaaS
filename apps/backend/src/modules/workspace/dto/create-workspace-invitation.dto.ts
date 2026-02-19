import { WorkspaceRole } from "@prisma/client";
import { IsEmail, IsEnum } from "class-validator";

export class CreateWorkspaceInvitationDto {
  @IsEmail()
  email!: string;

  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}
