import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplicationStatusHistoryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ nullable: true })
  previousStatus: string | null;

  @ApiProperty()
  newStatus: string;

  @ApiProperty()
  changedAt: Date;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  changedById: string | null;

  @ApiPropertyOptional({ nullable: true })
  changedByName: string | null;

  @ApiPropertyOptional({ nullable: true })
  rejectionNote: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  rejectionReasonId: string | null;

  @ApiPropertyOptional({ nullable: true })
  rejectionReasonSnapshot: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  previousStageId: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  newStageId: string | null;

  @ApiPropertyOptional({ nullable: true })
  previousStageName: string | null;

  @ApiPropertyOptional({ nullable: true })
  newStageName: string | null;

  @ApiProperty({ enum: ['stage', 'reopen'] })
  transitionKind: 'stage' | 'reopen';

  @ApiPropertyOptional({ nullable: true })
  transitionNote: string | null;
}
