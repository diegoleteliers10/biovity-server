import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

// Credentials mode ('include') forbids the '*' wildcard for
// Access-Control-Allow-Origin, so we echo the request origin. Same-origin and
// non-browser callers have no Origin header and bypass CORS entirely.
export const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, origin?: string) => void,
  ) => {
    callback(null, origin ?? '*');
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
  allowedHeaders: 'Content-Type, Accept, Authorization, Origin',
};
