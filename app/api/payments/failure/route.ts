import {env} from 'cloudflare:workers';
import {recordPaymentFailure} from '../../../../server/payment-core.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return recordPaymentFailure(request,env);}
