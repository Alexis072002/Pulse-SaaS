import { IsString, Length } from "class-validator";

export class UpdateWorkspaceNameDto {
  @IsString()
  @Length(3, 60)
  name!: string;
}
