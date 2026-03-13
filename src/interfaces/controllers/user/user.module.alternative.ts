import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from '../../../core/services/user.service';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    // Usar un repositorio mock o en memoria si no hay base de datos local
    {
      provide: 'IUserRepository',
      useFactory: () => {
        console.log('⚠️  Usando repositorio de usuario mock - sin base de datos local');
        return {
          create: async () => { throw new Error('Base de datos no disponible'); },
          findById: async () => null,
          findByEmail: async () => null,
          findByOrganizationId: async () => [],
          update: async () => null,
          delete: async () => false,
        };
      },
    },
  ],
  exports: [UserService],
})
export class UserModuleAlternative {}