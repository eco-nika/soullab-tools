import {env} from 'cloudflare:workers';
import {handleLearningMcp} from '../../server/agent-learning-mcp.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleLearningMcp(request,env);}
