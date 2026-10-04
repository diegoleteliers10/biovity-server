import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrganizationMemberService } from '../../../core/services/organization-member.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import {
  AddMemberDto,
  UpdateMemberRoleDto,
  OrganizationMemberResponseDto,
} from '../../dtos/organization/organization-member.dto';
import { OrganizationMemberDomainDtoMapper } from '../../../shared/mappers/organization/organization-member-domain-dto.mapper';
import {
  PaginatedResponse,
  parsePagination,
} from '../../../shared/pagination/pagination';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';

@ApiTags('organizations')
@Roles('organization')
@Controller('organizations/:organizationId/members')
export class OrganizationMemberController {
  constructor(
    private readonly memberService: OrganizationMemberService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar miembros de la organización' })
  async getMembers(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: Record<string, string>,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<PaginatedResponse<OrganizationMemberResponseDto>> {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'read',
    );
    const result = await this.memberService.getMembers(
      organizationId,
      parsePagination(query),
    );
    return {
      ...result,
      data: result.data.map(m => OrganizationMemberDomainDtoMapper.toDto(m)),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agregar miembro a la organización' })
  async addMember(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<OrganizationMemberResponseDto> {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'manage',
    );
    await this.organizationAccess.assertOrganizationMemberUser(dto.userId);
    const member = await this.memberService.addMember({
      organizationId,
      userId: dto.userId,
      role: dto.role,
    });
    return OrganizationMemberDomainDtoMapper.toDto(member);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar rol de miembro' })
  async updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<OrganizationMemberResponseDto> {
    const existing = await this.memberService.getMemberById(id);
    await this.organizationAccess.assertAccess(
      existing.organizationId,
      requester,
      'manage',
    );
    const member = await this.memberService.updateMemberRole(id, {
      role: dto.role,
    });
    return OrganizationMemberDomainDtoMapper.toDto(member);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar miembro de la organización' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    const existing = await this.memberService.getMemberById(id);
    await this.organizationAccess.assertAccess(
      existing.organizationId,
      requester,
      'manage',
    );
    await this.memberService.removeMember(id);
  }
}
