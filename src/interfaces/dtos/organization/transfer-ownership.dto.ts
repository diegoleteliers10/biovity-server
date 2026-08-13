import { IsUUID } from 'class-validator';

export class TransferOwnershipDto {
  @IsUUID()
  newOwnerUserId: string;
}
