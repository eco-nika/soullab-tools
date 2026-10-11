// Deterministic lexical feature hashing, not a neural or OpenAI embedding model.
export const MODEL = 'local-hash-ko-word-char-ngram-v1';
export const DIMS = 512;
export function hash(text) {
  let h = 2166136261;
  for (const c of text) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function tokens(text) {
  return String(text).normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
}
export function embed(text) {
  const features = new Map();
  const add = (key, weight) => features.set(key, (features.get(key) || 0) + weight);
  for (const word of tokens(text)) {
    add('w:' + word, 2);
    for (const n of [2, 3]) for (let i = 0; i <= word.length - n; i++) add('c:' + word.slice(i, i + n), 1);
  }
  const vector = Array(DIMS).fill(0);
  for (const [key, weight] of features) vector[hash(key) % DIMS] += Math.log1p(weight);
  const norm = Math.hypot(...vector);
  return norm ? vector.map(v => Number((v / norm).toFixed(8))) : vector;
}
export function cosine(a, b) {
  if (a.length !== b.length) throw new Error('Embedding dimension mismatch');
  let dot=0, aa=0, bb=0;
  for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}
export function lexicalOverlap(a, b) {
  const right=tokens(b);
  return tokens(a).some(x=>x.length>=2 && right.some(y=>y.length>=2 && (y.includes(x)||x.includes(y))));
}
export function splitMarkdown(markdown, source) {
  const out=[]; let title=source, section='', paragraph=[];
  const flush=()=>{if(paragraph.length){out.push({source,title:section?`${title} · ${section}`:title,chunk:paragraph.join('\n')});paragraph=[];}};
  for(const line of markdown.split(/\r?\n/)) {
    if(/^## 변경 기록/.test(line)){flush();break;}
    if(/^# /.test(line)){flush();title=line.slice(2).trim();continue;}
    if(/^## /.test(line)){flush();section=line.slice(3).trim();continue;}
    if(!line.trim()){flush();continue;}
    if(line.startsWith('|')) {
      flush();
      if(/^\|\s*[-: ]+\|/.test(line)||/상품·서비스.*확인된 조건|대상.*구체적인 실무 예시|피할 표현.*사용할 수 있는 표현/.test(line))continue;
      out.push({source,title:`${title} · ${section}`,chunk:line.split('|').map(x=>x.trim()).filter(Boolean).join(' — ')});
    }else paragraph.push(line);
  }
  flush();return out;
}
