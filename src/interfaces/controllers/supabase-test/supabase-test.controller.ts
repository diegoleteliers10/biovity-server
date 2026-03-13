import { Controller, Get, Post, Body } from '@nestjs/common';
import { SupabaseService } from '../../../infrastructure/database/supabase.service';

@Controller('supabase-test')
export class SupabaseTestController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get('test-connection')
  async testConnection() {
    try {
      // Prueba de conexión simple
      const { data, error } = await this.supabaseService.client.auth.getSession();
      
      if (error) {
        return {
          success: false,
          message: 'Error de conexión con Supabase',
          error: error.message
        };
      }

      return {
        success: true,
        message: 'Conexión con Supabase establecida correctamente',
        session: data?.session || null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return {
        success: false,
        message: 'Error al conectar con Supabase',
        error: errorMessage
      };
    }
  }

  @Post('test-insert')
  async testInsert(@Body() data: any) {
    try {
      // Ejemplo de inserción en una tabla (ajusta el nombre de la tabla según tu esquema)
      const result = await this.supabaseService.insert('test_table', data);
      
      return {
        success: true,
        message: 'Datos insertados correctamente',
        data: result
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return {
        success: false,
        message: 'Error al insertar datos',
        error: errorMessage
      };
    }
  }

  @Get('test-select')
  async testSelect() {
    try {
      // Ejemplo de consulta de datos (ajusta el nombre de la tabla según tu esquema)
      const data = await this.supabaseService.get('test_table');
      
      return {
        success: true,
        message: 'Datos obtenidos correctamente',
        data: data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return {
        success: false,
        message: 'Error al obtener datos',
        error: errorMessage
      };
    }
  }
}
