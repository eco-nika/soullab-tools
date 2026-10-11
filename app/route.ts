import html from '../content/index.html?raw';
import {env} from 'cloudflare:workers';
import {ensureKnowledge} from '../server/knowledge-store.mjs';
export const dynamic = 'force-dynamic';
export async function GET() {
  // Seed only versioned public knowledge and synthetic examples. Never inquiry inputs.
  try{await ensureKnowledge(env);}catch{/* Knowledge pages show DB errors; the reply tool remains usable. */}
  return new Response(html, {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
}
