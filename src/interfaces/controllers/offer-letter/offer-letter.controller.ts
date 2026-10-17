import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Delete,
  NotFoundException,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { OfferLetterService } from '../../../core/services/offer-letter.service';
import {
  CreateOfferLetterDto,
  ResendOfferLetterDto,
  RespondOfferLetterDto,
} from '../../dtos/offer-letter/offer-letter.dto';

@ApiTags('offer-letters')
@Controller('offer-letters')
export class OfferLetterController {
  constructor(
    private readonly offerLetterService: OfferLetterService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Post()
  @Roles('organization')
  async create(
    @Body() dto: CreateOfferLetterDto,
    @CurrentUser() requester: AuthenticatedUser,
    @Res() response: Response,
  ) {
    await this.organizationAccess.assertApplicationAccess(
      dto.applicationId,
      requester,
      'recruit',
    );
    const result = await this.offerLetterService.createAndSend(
      {
        applicationId: dto.applicationId,
        title: dto.title,
        letterData: dto.letterData,
        pdfPath: dto.pdfPath,
        chatId: dto.chatId,
        expiresOn: dto.expiresOn,
      },
      requester.id,
    );
    if ('kind' in result) {
      return response
        .status(400)
        .json({ message: 'La fecha de vencimiento debe ser hoy o posterior.' });
    }
    return response.json(result.offerLetter);
  }

  @Get('application/:applicationId')
  @Roles('organization')
  async findByApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    await this.organizationAccess.assertApplicationAccess(
      applicationId,
      requester,
      'read',
    );
    return {
      data: await this.offerLetterService.findByApplicationId(applicationId),
    };
  }

  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    const offer = await this.offerLetterService.findById(id);
    if (!offer) throw new NotFoundException('Offer letter not found');
    if (requester?.type === 'organization') {
      await this.organizationAccess.assertApplicationAccess(
        offer.applicationId,
        requester,
        'read',
      );
    } else {
      this.offerLetterService.assertCanView(offer, requester);
    }
    return offer;
  }

  @Post(':id/respond')
  async respond(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondOfferLetterDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    if (!requester) throw new ForbiddenException('No autorizado');
    return this.offerLetterService.respond(id, dto.response, requester.id);
  }

  @Post(':id/resend')
  @Roles('organization')
  async resend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ResendOfferLetterDto,
    @CurrentUser() requester: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const offer = await this.offerLetterService.findById(id);
    if (!offer)
      return response.status(404).json({ message: 'Offer letter not found' });
    await this.organizationAccess.assertApplicationAccess(
      offer.applicationId,
      requester,
      'recruit',
    );
    const expiresOn = body.expiresOn;
    const updated = await this.offerLetterService.resend(
      id,
      requester.id,
      expiresOn,
      body.pdfPath,
    );
    if (updated === 'invalid_expiry') {
      return response
        .status(400)
        .json({ message: 'La fecha de vencimiento debe ser hoy o posterior.' });
    }
    if (updated === 'invalid_pdf_path') {
      return response.status(400).json({ message: 'Invalid offer PDF path' });
    }
    if (!updated)
      return response
        .status(409)
        .json({ message: 'La oferta ya no está disponible.' });
    return response.json({ status: 'sent', expiresOn });
  }

  @Delete(':id')
  @Roles('organization')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const offer = await this.offerLetterService.findById(id);
    if (!offer)
      return response.status(404).json({ message: 'Offer letter not found' });
    await this.organizationAccess.assertApplicationAccess(
      offer.applicationId,
      requester,
      'recruit',
    );
    const cancelled = await this.offerLetterService.cancel(id, requester.id);
    if (!cancelled)
      return response
        .status(409)
        .json({ message: 'La oferta ya no se puede cancelar.' });
    return response.json({ status: 'cancelled' });
  }
}
