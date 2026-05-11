import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return false;

    request.user = { id: 'user-id-from-token' };
    return true;
  }
}
