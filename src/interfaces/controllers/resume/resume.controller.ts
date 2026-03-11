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
} from '@nestjs/common';
import { ResumeService } from '../../../core/services/resume.service';
import { ResumeDtoDomainMapper } from '../../../shared/mappers/resume/resumeDto-domain.mapper';
import { ResumeCreateDto } from '../../dtos/resume/resume-create.dto';
import { ResumeResponseDto } from '../../dtos/resume/resume-response.dto';
import { ResumeDomainDtoMapper } from '../../../shared/mappers/resume/resumeDomain-dto.mapper';

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
  ): Promise<ResumeResponseDto | null> {
    const resume = await this.resumeService.getResumeById(id);
    return resume ? ResumeDomainDtoMapper.toDto(resume) : null;
  }

  @Get('user/:userId')
  async getResumeByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ResumeResponseDto | null> {
    const resume = await this.resumeService.getResumeByUserId(userId);
    return resume ? ResumeDomainDtoMapper.toDto(resume) : null;
  }

  @Get()
  async getAllResumes(): Promise<ResumeResponseDto[]> {
    const resumes = await this.resumeService.getAllResumes();
    return resumes.map(resume => ResumeDomainDtoMapper.toDto(resume));
  }

  @Put(':id')
  async updateResume(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<ResumeCreateDto>,
  ): Promise<ResumeResponseDto | null> {
    const input = ResumeDtoDomainMapper.toCreateResumeInput(dto as ResumeCreateDto);
    const resume = await this.resumeService.updateResume(id, input);
    return resume ? ResumeDomainDtoMapper.toDto(resume) : null;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteResume(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.resumeService.deleteResume(id);
  }
}
