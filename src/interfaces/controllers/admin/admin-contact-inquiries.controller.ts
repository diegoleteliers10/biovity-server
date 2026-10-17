import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminContactInquiriesService } from '../../../core/services/admin-contact-inquiries.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import {
  ContactInquiryQueryDto,
  UpdateContactInquiryDto,
} from '../../dtos/admin/contact-inquiries.dto';

@ApiTags('admin-contact-inquiries')
@Roles('admin')
@Controller('admin/contact-inquiries')
export class AdminContactInquiriesController {
  constructor(private readonly inquiries: AdminContactInquiriesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar consultas de contacto para administración' })
  list(@Query() query: ContactInquiryQueryDto) {
    return this.inquiries.list(query);
  }

  @Get('operators')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar administradores activos asignables' })
  listOperators() {
    return this.inquiries.listOperators();
  }

  @Get(':id/events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consultar el historial de una consulta' })
  events(@Param('id', ParseIntPipe) id: number) {
    return this.inquiries.events(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar el seguimiento de una consulta' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdateContactInquiryDto,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    if (!actor) {
      return Promise.reject(new UnauthorizedException());
    }
    return this.inquiries.update(id, actor.id, input);
  }
}
