import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type AuthenticatedRequest = Request & {
  user: { id: string; email?: string };
  accessToken: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<any>();
    const header = request.headers?.authorization as string | undefined;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');

    const accessToken = header.slice('Bearer '.length);
    const { data, error } = await this.supabase.publicClient().auth.getUser(accessToken);
    if (error || !data.user) throw new UnauthorizedException('Invalid or expired session');

    request.user = { id: data.user.id, email: data.user.email };
    request.accessToken = accessToken;
    return true;
  }
}
