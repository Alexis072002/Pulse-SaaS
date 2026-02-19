import { IsString, MinLength } from "class-validator";

export class SwitchWorkspaceDto {
  @IsString()
  @MinLength(5)
  workspaceId!: string;
}
