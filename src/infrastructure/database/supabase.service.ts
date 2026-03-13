import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../config/supabase.config';

@Injectable()
export class SupabaseService {
  constructor(private readonly supabaseConfig: SupabaseConfig) {}

  get client(): SupabaseClient {
    return this.supabaseConfig.getClient();
  }

  // Métodos de autenticación
  async signUp(email: string, password: string) {
    return await this.client.auth.signUp({ email, password });
  }

  async signIn(email: string, password: string) {
    return await this.client.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return await this.client.auth.signOut();
  }

  // Métodos de base de datos
  async from(table: string) {
    return this.client.from(table);
  }

  // Obtener datos
  async get(table: string, select = '*') {
    const { data, error } = await this.client.from(table).select(select);
    if (error) throw error;
    return data;
  }

  // Insertar datos
  async insert(table: string, data: any) {
    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select();
    if (error) throw error;
    return result;
  }

  // Actualizar datos
  async update(table: string, data: any, match: any) {
    const { data: result, error } = await this.client
      .from(table)
      .update(data)
      .match(match)
      .select();
    if (error) throw error;
    return result;
  }

  // Eliminar datos
  async delete(table: string, match: any) {
    const { data: result, error } = await this.client
      .from(table)
      .delete()
      .match(match)
      .select();
    if (error) throw error;
    return result;
  }
}
