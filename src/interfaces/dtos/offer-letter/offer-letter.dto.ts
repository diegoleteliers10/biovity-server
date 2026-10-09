import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class OfferLetterDataDto {
  @IsString()
  companyName: string;

  @IsString()
  candidateName: string;

  @IsString()
  jobTitle: string;

  @IsOptional()
  @IsString()
  greeting?: string;

  @IsOptional()
  @IsString()
  intro?: string;

  @IsOptional()
  @IsString()
  positionSummary?: string;

  @IsOptional()
  @IsString()
  compensation?: string;

  @IsOptional()
  @IsString()
  compensationDetail?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  workMode?: string;

  @IsOptional()
  @IsString()
  conditions?: string;

  @IsOptional()
  @IsString()
  closing?: string;

  @IsOptional()
  @IsString()
  signerName?: string;

  @IsOptional()
  @IsString()
  signerRole?: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;

  [key: string]: unknown;
}

export class CreateOfferLetterDto {
  @IsUUID()
  applicationId: string;

  @IsOptional()
  @IsUUID()
  chatId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  pdfPath: string;

  @IsObject()
  @ValidateNested()
  @Type(() => OfferLetterDataDto)
  letterData: OfferLetterDataDto;
}

export class RespondOfferLetterDto {
  @IsIn(['accepted', 'rejected'])
  response: 'accepted' | 'rejected';
}
