import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfferLetterEntity } from '../../../infrastructure/database/orm';
import { OfferLetterController } from './offer-letter.controller';
import { OfferLetterService } from '../../../core/services/offer-letter.service';
import { OfferLetterRepositoryImpl } from '../../../infrastructure/persistence/offer-letter.repository.impl';
import { ApplicationModule } from '../application/application.module';
import { OfferResponseEmailBridgeService } from '../../../core/services/offer-response-email-bridge.service';
import { OfferResponseEmailIntentRepositoryImpl } from '../../../infrastructure/persistence/offer-response-email-intent.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([OfferLetterEntity]), ApplicationModule],
  controllers: [OfferLetterController],
  providers: [
    OfferLetterService,
    OfferResponseEmailBridgeService,
    {
      provide: 'IOfferResponseEmailIntentRepository',
      useClass: OfferResponseEmailIntentRepositoryImpl,
    },
    {
      provide: 'IOfferLetterRepository',
      useClass: OfferLetterRepositoryImpl,
    },
  ],
  exports: [OfferLetterService, OfferResponseEmailBridgeService],
})
export class OfferLetterModule {}
