import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { APPLICATION_SOURCE_CHANNELS } from '../../../core/domain/application-source';
import type { JobDistributionSource } from '../../../core/services/job-distribution-source.service';

const DISTRIBUTION_CHANNELS = APPLICATION_SOURCE_CHANNELS.filter(
  (channel): channel is Exclude<typeof channel, 'unknown'> =>
    channel !== 'unknown',
);

export class CreateJobDistributionSourceDto {
  @ApiProperty({ enum: DISTRIBUTION_CHANNELS })
  @IsIn(DISTRIBUTION_CHANNELS)
  sourceChannel: JobDistributionSource['sourceChannel'];
}

export class JobDistributionSourceResponseDto {
  id: string;
  jobId: string;
  sourceChannel: JobDistributionSource['sourceChannel'];
  createdAt: Date;
  disabledAt: Date | null;
}
