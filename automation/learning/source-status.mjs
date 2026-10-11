#!/usr/bin/env node
// Read-only worktree check. Fetches canonical GitHub main; never merges/resets/pushes.
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../../',import.meta.url));
const run=args=>execFileSync('git',args,{cwd,encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']}).trim();
try {
  const local=run(['rev-parse','HEAD']);
  const dirty=Boolean(run(['status','--porcelain']));
  run(['fetch','--no-tags','https://github.com/eco-nika/soullab-tools.git','main']);
  const github=run(['rev-parse','FETCH_HEAD']);
  const same_tree=run(['rev-parse',local+'^{tree}'])===run(['rev-parse',github+'^{tree}']);
  console.log(JSON.stringify({local,github,dirty,same_tree,fetched_at:new Date().toISOString(),
    next:same_tree&&!dirty?'Read AGENTS and handoff, then request DB context.':'Compare changes; preserve local work. On a clean compatible branch, merge --ff-only FETCH_HEAD; never force/reset.'},null,2));
}catch{
  console.log(JSON.stringify({freshness:'unverified',task_may_continue:true,next:'Use GitHub connector to compare latest main and handoff. Do not claim latest revision verified.'}));
}
