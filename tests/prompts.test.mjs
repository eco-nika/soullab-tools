import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context={module:{exports:{}}};vm.runInNewContext(readFileSync(new URL('../public/prompt-data.js',import.meta.url),'utf8'),context);
const {PROMPT_JOBS,recommendPrompts}=context.module.exports;
test('all 12 job/task combinations return 3 distinct ready-to-copy prompts',()=>{let combinations=0;for(const [job,config] of Object.entries(PROMPT_JOBS))for(const task of Object.keys(config.tasks)){const prompts=recommendPrompts(job,task);assert.equal(prompts.length,3);assert.equal(new Set(prompts.map(x=>x.text)).size,3);for(const p of prompts){assert.ok(p.text.includes(config.role));assert.ok(p.text.includes('[기본 정보]'));assert.ok(!/undefined|NaN/.test(p.text));}combinations++;}assert.equal(combinations,12);});
test('unknown tasks fail closed',()=>{assert.equal(recommendPrompts('IT 기획','없는 과제').length,0);assert.equal(recommendPrompts('없음','없음').length,0);});
