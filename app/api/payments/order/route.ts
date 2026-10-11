import { env } from 'cloudflare:workers';
import { createOrder } from '../../../../server/payment-core.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) { return createOrder(request, env); }
