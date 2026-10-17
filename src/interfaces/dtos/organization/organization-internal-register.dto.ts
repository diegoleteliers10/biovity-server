import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class OrganizationInternalRegisterDto {
  @IsUUID()
  ownerUserId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  website: string;
}
