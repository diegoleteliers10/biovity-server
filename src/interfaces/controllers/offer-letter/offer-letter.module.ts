import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfferLetterEntity } from '../../../infrastructure/database/orm';
import { OfferLetterController } from './offer-letter.controller';
import { OfferLetterService } from '../../../core/services/offer-letter.service';
import { OfferLetterRepositoryImpl } from '../../../infrastructure/persistence/offer-letter.repository.impl';
import { EmailService } from '../../../core/services/email.service';
import { ApplicationModule } from '../application/application.module';

@Module({
  imports: [TypeOrmModule.forFeature([OfferLetterEntity]), ApplicationModule],
  controllers: [OfferLetterController],
  providers: [
    OfferLetterService,
    EmailService,
    {
      provide: 'IOfferLetterRepository',
      useClass: OfferLetterRepositoryImpl,
    },
  ],
})
export class OfferLetterModule {}
