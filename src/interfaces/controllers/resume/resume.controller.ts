import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResumeService } from '../../../core/services/resume.service';
import { ResumeDtoDomainMapper } from '../../../shared/mappers/resume/resumeDto-domain.mapper';
import { ResumeCreateDto } from '../../dtos/resume/resume-create.dto';
import { ResumeUpdateDto } from '../../dtos/resume/resume-update.dto';
import { ResumeResponseDto } from '../../dtos/resume/resume-response.dto';
import { ResumeDomainDtoMapper } from '../../../shared/mappers/resume/resumeDomain-dto.mapper';

@ApiTags('resume')
@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createResume(@Body() dto: ResumeCreateDto): Promise<ResumeResponseDto> {
    const input = ResumeDtoDomainMapper.toCreateResumeInput(dto);
    const resume = await this.resumeService.createResume(input);
    return ResumeDomainDtoMapper.toDto(resume);
  }

  @Get(':id')
  async getResumeById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResumeResponseDto> {
    const resume = await this.resumeService.getResumeById(id);
    if (!resume) throw new NotFoundException('Resume not found');
    return ResumeDomainDtoMapper.toDto(resume);
  }

  @Get('user/:userId')
  async getResumeByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ResumeResponseDto> {
    const resume = await this.resumeService.getResumeByUserId(userId);
    if (!resume) throw new NotFoundException('Resume not found');
    return ResumeDomainDtoMapper.toDto(resume);
  }

  @Get()
  async getAllResumes(): Promise<ResumeResponseDto[]> {
    const resumes = await this.resumeService.getAllResumes();
    return resumes.map(resume => ResumeDomainDtoMapper.toDto(resume));
  }

  @Put(':id')
  async updateResume(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResumeUpdateDto,
  ): Promise<ResumeResponseDto> {
    const input = ResumeDtoDomainMapper.toCreateResumeInput(
      dto as ResumeCreateDto,
    );
    const resume = await this.resumeService.updateResume(id, input);
    if (!resume) throw new NotFoundException('Resume not found');
    return ResumeDomainDtoMapper.toDto(resume);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteResume(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.resumeService.deleteResume(id);
  }
}
