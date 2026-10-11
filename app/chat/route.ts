import html from '../../content/chat.html?raw';
import {env} from 'cloudflare:workers';
import {ensureKnowledge} from '../../server/knowledge-store.mjs';
export const dynamic='force-dynamic';
export async function GET(){try{await ensureKnowledge(env);}catch{/* Data API displays a retriable error. */}return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});}
