const COLUMNS='order_id, product_name, amount, status, recorded_at';
export const ORDER_FIELDS=['order_id','product_name','amount','status','recorded_at'];
export async function saveOrder(env, orderId, status='READY') {
  if(!env.DB)throw new Error('Database unavailable');
  if(!/^sltest_[a-f0-9]{32}$/.test(orderId)||!['READY','DONE','FAILED','CANCELED','UNKNOWN'].includes(status))throw new Error('Invalid test order');
  await env.DB.prepare(`INSERT INTO test_orders (${COLUMNS}) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(order_id) DO UPDATE SET status=excluded.status, recorded_at=excluded.recorded_at
    WHERE test_orders.status != 'DONE' OR excluded.status = 'DONE'`)
    .bind(orderId,'직무별 AI 프롬프트 모음집 PDF',19000,status,new Date().toISOString()).run();
}
export function cleanRows(rows) {
  // Export allowlist. Never serialize the environment, request, provider response or arbitrary DB columns.
  return rows.map(row=>Object.fromEntries(ORDER_FIELDS.map(field=>[field, field==='amount'?Number(row[field]):String(row[field]??'')])));
}
export async function listOrders(env) {
  if(!env.DB)throw new Error('Database unavailable');
  const result=await env.DB.prepare(`SELECT ${COLUMNS} FROM test_orders ORDER BY recorded_at DESC, order_id ASC`).all();
  return cleanRows(result.results||[]);
}
export async function seedOrders(env) {
  if(!env.DB)throw new Error('Database unavailable');
  const date=new Date();
  const states=['READY','DONE','FAILED'];
  const statements=states.map((status,i)=>env.DB.prepare(`INSERT OR IGNORE INTO test_orders (${COLUMNS}) VALUES (?, ?, ?, ?, ?)`)
    .bind(`sample-order-${i+1}`,'직무별 AI 프롬프트 모음집 PDF',19000,status,new Date(date.getTime()-i*60000).toISOString()));
  await env.DB.batch(statements);
}
export function csvFromRows(rows) {
  const cell=value=>{let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  return '\uFEFF'+[ORDER_FIELDS.map(cell).join(','),...cleanRows(rows).map(row=>ORDER_FIELDS.map(key=>cell(row[key])).join(','))].join('\r\n')+'\r\n';
}
