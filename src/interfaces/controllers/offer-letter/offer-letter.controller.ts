import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { OfferLetterService } from '../../../core/services/offer-letter.service';
import {
  CreateOfferLetterDto,
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
      },
      requester.id,
    );
    return result.offerLetter;
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
}
