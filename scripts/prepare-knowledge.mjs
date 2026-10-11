import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {splitMarkdown,embed,MODEL,DIMS} from '../server/embedding.mjs';
const root=new URL('../',import.meta.url);
const rows=['identity','voice','audience','content'].flatMap(name=>{
  const source=`brand/${name}.md`;
  return splitMarkdown(readFileSync(new URL(source,root),'utf8'),source);
});
for(const product of JSON.parse(readFileSync(new URL('server/products.json',root),'utf8')))rows.push({source:'server/products.json',...product});
const chunks=rows.map((row,i)=>({...row,id:'knowledge-'+createHash('sha256').update(MODEL+'\n'+row.source+'\n'+row.title+'\n'+row.chunk).digest('hex').slice(0,24),model:MODEL,dims:DIMS,embedding:embed(row.chunk)}));
const output=JSON.stringify({model:MODEL,dims:DIMS,chunks},null,2)+'\n';
const file=new URL('server/knowledge-data.json',root);
if(process.argv.includes('--check')){
  if(readFileSync(file,'utf8')!==output)throw new Error('Knowledge corpus is stale: run node scripts/prepare-knowledge.mjs');
}else writeFileSync(file,output);
console.log(`Knowledge: ${chunks.length} paragraphs, ${MODEL}, ${DIMS} dimensions`);
