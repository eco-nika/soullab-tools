import {env} from 'cloudflare:workers';
import {handleLearning} from '../../../server/agent-learning-handler.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleLearning(request,env);}
