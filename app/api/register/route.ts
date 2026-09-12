import { handleRegistrationRequest } from '@/lib/portal/registration';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => handleRegistrationRequest(request);
export const POST = (request: Request) => handleRegistrationRequest(request);
