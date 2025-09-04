import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { securityHeaders } from '@/lib/security/headers'

export async function middleware(request: NextRequest) {
  // Apply security headers first
  const response = securityHeaders(request);
  
  // Then handle session updates
  const sessionResponse = await updateSession(request);
  
  // Merge security headers with session response
  if (sessionResponse) {
    response.headers.set('Set-Cookie', sessionResponse.headers.get('Set-Cookie') || '');
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|register|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}