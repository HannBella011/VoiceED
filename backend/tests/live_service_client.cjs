// Runs only when started by the opt-in live Python integration suite.
// Tokens arrive on stdin and are never printed or written to disk.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '../../frontend');
const frontendRequire = createRequire(path.join(root, 'package.json'));
const ts = frontendRequire('typescript');
function load(file) {
  if (!path.extname(file)) file += '.js';
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const module = {exports:{}};
  const request = name => name.startsWith('@/') ? load(path.join(root,name.slice(2))) : name.startsWith('.') ? load(path.resolve(path.dirname(file),name)) : frontendRequire(name);
  new Function('require','module','exports',code)(request,module,module.exports);
  return module.exports;
}
async function main() {
  const input = JSON.parse(fs.readFileSync(0,'utf8'));
  process.env.NEXT_PUBLIC_API_URL = input.api;
  let token = input.admin;
  global.window = {};
  global.localStorage = {getItem:()=>token};
  const {inspireRequest:request, shareLink} = load(path.join(root,'services/inspire.js'));
  const {adminService} = load(path.join(root,'services/admin.js'));
  const {superService} = load(path.join(root,'services/super.js'));
  const {shareService} = load(path.join(root,'services/share.js'));
  const body = {version:1,blocks:[{type:'paragraph',children:[{text:'Frontend to PostgreSQL 😀',marks:['bold']}]}]};
  const post = await request('/stories',{method:'POST',data:{title:input.prefix,body}});
  const endpoint = `/stories/${post.record_id}`;
  assert.deepEqual((await request(endpoint)).body, body);
  assert.equal((await request(endpoint+'/reaction',{method:'PUT'})).likes,1);
  assert.equal((await request(endpoint+'/reaction',{method:'PUT'})).likes,1);
  await request(endpoint+'/comments',{method:'POST',data:{content:'Persisted frontend comment'}});
  assert.equal((await request(endpoint+'/comments?envelope=true&limit=1')).total,1);
  const shared = await shareLink(post,{copy:true,loggedIn:true,origin:'https://voice.test',browser:{clipboard:{writeText:async()=>{}}}});
  assert.equal(shared.updated.shares,1);
  const materials = await shareService.getMaterials({search:input.prefix,envelope:true,limit:1});
  assert.equal(materials.total,1);
  assert.equal(materials.items.length,1);
  const before = materials.items[0].download_count;
  assert.equal((await shareService.recordDownload(materials.items[0].id)).download_count,before+1);
  await assert.rejects(superService.users({limit:1}), /Super admin access required/);
  token = input.super;
  await superService.stats();
  await adminService.remove('story',post.record_id,{reason:input.prefix+' moderation',internal_notes:'Restricted test note'});
  await assert.rejects(request(endpoint), /Post not found/);
  token = input.admin;
  const inbox = await (await fetch(input.api+'/messages',{headers:{Authorization:`Bearer ${token}`}})).json();
  const notice = inbox.find(item=>item.message.includes(input.prefix));
  assert.ok(notice);
  assert.ok(!notice.message.includes('Restricted test note'));
  console.log('Frontend services -> FastAPI -> configured PostgreSQL passed');
}
main().catch(error=>{console.error(error.name+': '+error.message);process.exitCode=1;});
