import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../repositories/user.repository';
import { UserResponseDto } from '../../../interfaces/dtos/user/user-response.dto';
import { UserDomainDtoMapper } from '../../../shared/mappers/user/userDomain-dto.mapper';
import { User } from '../../domain/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface RegisterUserInput {
  email: string;
  name: string;
  password: string;
  type: 'organización' | 'persona';
}

@Injectable()
export class RegisterUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: RegisterUserInput): Promise<UserResponseDto> {
    // Validaciones de negocio
    await this.validateBusinessRules(input);

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // Generar token de verificación
    const verificationToken = uuidv4();

    // Crear entidad de dominio
    const user = new User(
      uuidv4(), // ID
      input.email.toLowerCase(),
      input.name,
      hashedPassword,
      input.type,
      false, // isEmailVerified
      true, // isActive
      verificationToken,
    );

    // Persistir
    const savedUser = await this.userRepository.create(user);

    // Convertir a DTO para respuesta usando el mapper Domain → DTO
    return UserDomainDtoMapper.toDto(savedUser);
  }

  private async validateBusinessRules(input: RegisterUserInput): Promise<void> {
    // Validar email único
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      throw new Error('Invalid email format');
    }

    // Validar contraseña
    if (input.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Validar nombre
    if (!input.name || input.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }

    // Validar tipo de usuario
    if (!['organización', 'persona'].includes(input.type)) {
      throw new Error('Invalid user type');
    }
  }
}
