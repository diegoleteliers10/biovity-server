import { IsIn, IsString, IsUrl, Length, MaxLength } from 'class-validator';

export class OrganizationVerificationSubmitDto {
  @IsString()
  @MaxLength(200)
  legalName: string;

  @IsString()
  @Length(2, 2)
  countryCode: string;

  @IsString()
  @MaxLength(100)
  registrationNumber: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  registryUrl: string;
}

export class OrganizationVerificationDecisionDto {
  @IsString()
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @IsString()
  @MaxLength(2000)
  reason: string;
}
