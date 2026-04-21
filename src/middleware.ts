import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Force HTTPS in production
  if (request.headers.get('x-forwarded-proto') === 'https') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Block suspicious paths
  const suspiciousPatterns = [
    /(\.\.\/)/,
    /(union\s+select)/i,
    /(script\s*>)/i,
    /(\/etc\/passwd)/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(pathname)) {
      return new NextResponse('Blocked', { status: 400 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
