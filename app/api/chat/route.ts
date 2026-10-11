import {env} from 'cloudflare:workers';
import {handleChat} from '../../../server/chat-handler.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleChat(request,env);}
