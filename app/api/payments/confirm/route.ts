import { env } from 'cloudflare:workers';
import { confirmPayment } from '../../../../server/payment-core.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) { return confirmPayment(request, env); }
