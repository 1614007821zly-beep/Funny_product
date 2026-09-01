// Explicit local-only integration test. Never used by the default/offline test suite.
// Sites dev authentication headers represent isolated fixtures, not real login verification.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base='http://localhost:3000';
const run=randomUUID();
const A=`local-flow-A-${run}`, B=`local-flow-B-${run}`;
const checks=[];
async function call(user,path,method='GET',body,expected=200) {
  const response=await fetch(base+path,{method,headers:{'content-type':'application/json',...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':`${user}@example.invalid`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const raw=await response.text();
  assert.ok(raw,`${method} ${path}: empty response (${response.status})`);
  const data=JSON.parse(raw);
  assert.equal(response.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
async function upload(user,visibility='personal'){
  const form=new FormData();form.set('visibility',visibility);form.set('file',new File([new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])],'local.png',{type:'image/png'}));
  const response=await fetch(base+'/api/media',{method:'POST',headers:{'oai-authenticated-user-id':user,'oai-authenticated-user-email':`${user}@example.invalid`},body:form});
  const data=await response.json();assert.equal(response.status,201,JSON.stringify(data));return data.media;
}
async function mediaStatus(user,id){return (await fetch(`${base}/api/media?id=${encodeURIComponent(id)}`,{headers:{'oai-authenticated-user-id':user,'oai-authenticated-user-email':`${user}@example.invalid`}})).status;}
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const yesterday=(()=>{const d=new Date();d.setDate(d.getDate()-1);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)})();
let personalId, relationshipActive=false;
try {
  await call(null,'/api/schedules','GET',undefined,401);
  await call(A,'/api/account');await call(B,'/api/account');
  for(const invalid of [{eventDate:''},{eventDate:'2026-02-30'},{eventTime:'25:00'},{title:' '}]) {
    await call(A,'/api/schedules','POST',{title:'本地隔离流程验收',eventDate:today,eventTime:'18:30',city:'成都',...invalid},400);
  }
  checks.push('匿名拒绝、空日期、不存在日期、非法时间、空名称校验');
  const futureDate=(()=>{const d=new Date();d.setDate(d.getDate()+1);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)})();
  const future=(await call(A,'/api/schedules','POST',{title:'未来计划不可提前完成',eventDate:futureDate,eventTime:'23:59',city:'成都'},201)).schedule;
  await call(A,'/api/schedules','PATCH',{id:future.id,action:'request_complete',version:future.version},409);
  await call(A,'/api/schedules','PATCH',{id:future.id,action:'delete'});
  const facts={version:1,title:`本地隔离流程验收 ${run.slice(0,8)}`,city:'成都',summary:'只用于本地持久化验收',duration:'2 小时',budgetPreference:'¥100–300',priceNote:'已知地点消费约 ¥120',capturedAt:new Date().toISOString(),timeline:[{time:'18:30',title:'测试书店',description:'保存时选择'}],places:[{id:'local-poi',name:'测试书店',address:'测试地址',location:'104.08,30.65',cost:'60',openTimeToday:'',distance:500}]};
  const created=await call(A,'/api/schedules','POST',{title:facts.title,eventDate:yesterday,eventTime:'18:30',city:'成都',source:'ai',facts},201);
  personalId=created.schedule.id;
  assert.ok((await call(A,'/api/schedules')).schedules.some(s=>s.id===personalId));
  assert.ok(!(await call(B,'/api/schedules')).schedules.some(s=>s.id===personalId));
  await call(B,'/api/schedules','PATCH',{id:personalId,action:'delete'},403);
  checks.push('个人计划保存、重新读取与跨账号不可见/不可删');
  const changed=await call(A,'/api/schedules','PATCH',{id:personalId,action:'update',title:'本地隔离流程验收（已编辑）',eventDate:yesterday,eventTime:'19:00',city:'成都'});
  assert.equal(changed.schedule.event_time,'19:00');
  const invite=await call(A,'/api/relationship/invite','POST',{partnerNote:'隔离测试'});
  await call(A,'/api/relationship/join','POST',{code:invite.code},400);
  await call(B,'/api/relationship/join','POST',{code:invite.code});relationshipActive=true;
  assert.ok(!(await call(B,'/api/schedules')).schedules.some(s=>s.id===personalId));
  checks.push('邀请码禁止自接受，双账号绑定后个人计划仍不自动公开');
  const shared=await call(A,'/api/schedules','PATCH',{id:personalId,action:'share'});
  assert.equal(shared.schedule.status,'pending_partner');
  assert.ok((await call(B,'/api/schedules')).schedules.some(s=>s.id===personalId));
  await call(A,'/api/schedules','PATCH',{id:personalId,action:'accept'},400);
  await call(A,'/api/share-links','POST',{scheduleId:personalId},403);
  const accepted=await call(B,'/api/schedules','PATCH',{id:personalId,action:'accept'});
  assert.equal(accepted.schedule.status,'confirmed');
  assert.equal((await call(A,'/api/schedules')).schedules.find(s=>s.id===personalId).status,'confirmed');
  checks.push('主动分享、双方可读、禁止自己替伴侣接受、待确认不能公开分享');
  const link=(await call(A,'/api/share-links','POST',{scheduleId:personalId},201)).link;
  const publicPage=await fetch(base+link.path);
  assert.equal(publicPage.status,200);assert.match(await publicPage.text(),/本地隔离流程验收/);
  await call(A,'/api/share-links','DELETE',{id:link.id});
  const revoked=await fetch(base+link.path);
  assert.match(await revoked.text(),/失效|撤回|不存在/);
  checks.push('本地公开分享及撤回后失效');
  const requested=await call(A,'/api/schedules','PATCH',{id:personalId,action:'request_complete',version:accepted.schedule.version});
  assert.equal(requested.schedule.status,'completion_pending');
  const retry=await call(A,'/api/schedules','PATCH',{id:personalId,action:'request_complete',version:accepted.schedule.version});
  assert.equal(retry.schedule.version,requested.schedule.version);
  await call(A,'/api/schedules','PATCH',{id:personalId,action:'confirm_complete',version:requested.schedule.version},409);
  const completed=await call(B,'/api/schedules','PATCH',{id:personalId,action:'confirm_complete',version:requested.schedule.version});
  assert.equal(completed.schedule.status,'completed');
  const retryCompleted=await call(B,'/api/schedules','PATCH',{id:personalId,action:'confirm_complete',version:requested.schedule.version});
  assert.equal(retryCompleted.schedule.version,completed.schedule.version);
  const memoriesA=await call(A,'/api/memories'),memoriesB=await call(B,'/api/memories');
  const memoryA=memoriesA.memories.find(memory=>memory.scheduleId===personalId),memoryB=memoriesB.memories.find(memory=>memory.scheduleId===personalId);
  assert.equal(memoryA.facts.places[0].name,'测试书店');assert.ok(memoryB);
  const photo=await upload(A);
  assert.equal(await mediaStatus(B,photo.id),403);
  const sharedMemory=await call(A,'/api/memories','PATCH',{id:memoryA.id,action:'update',version:memoryA.version,title:memoryA.title,note:'A 主动分享的文字',mediaId:photo.id,shareContribution:true});
  assert.equal((await call(B,`/api/memories?id=${encodeURIComponent(memoryB.id)}`)).memory.partnerContribution.note,'A 主动分享的文字');
  assert.equal(await mediaStatus(B,photo.id),200);
  await call(A,'/api/memories','PATCH',{id:memoryA.id,action:'delete',version:sharedMemory.memory.version},409);
  const retracted=await call(A,'/api/memories','PATCH',{id:memoryA.id,action:'retract_content',version:sharedMemory.memory.version});
  assert.equal((await call(B,`/api/memories?id=${encodeURIComponent(memoryB.id)}`)).memory.partnerContribution,null);
  assert.equal(await mediaStatus(B,photo.id),404);
  await call(A,'/api/memories','PATCH',{id:memoryA.id,action:'delete',version:retracted.memory.version});
  assert.ok((await call(B,'/api/memories')).memories.some(memory=>memory.id===memoryB.id));
  checks.push('双账号完成确认、重复请求幂等、原子生成双方回忆、分享/撤回/删除边界');
  personalId=null;
  const safetyPhoto=await upload(A,'shared');assert.equal(await mediaStatus(B,safetyPhoto.id),200);
  await call(A,'/api/relationship/leave','POST',{safety:true});relationshipActive=false;
  assert.equal(await mediaStatus(B,safetyPhoto.id),404);
  assert.equal((await call(A,'/api/account')).relationship,null);
  assert.equal((await call(B,'/api/account')).relationship,null);
  const second=await call(A,'/api/relationship/invite','POST',{});
  await call(B,'/api/relationship/join','POST',{code:second.code});relationshipActive=true;
  assert.equal((await call(A,'/api/schedules')).schedules.length,0);
  const disposable=(await call(A,'/api/schedules','POST',{title:'本地删除验收',eventDate:today,eventTime:'18:30',city:'成都'},201)).schedule;
  personalId=disposable.id;
  await call(A,'/api/schedules','PATCH',{id:personalId,action:'delete'});personalId=null;
  assert.equal((await call(A,'/api/schedules')).schedules.length,0);
  checks.push('安全退出、重新绑定不带入旧安排、个人计划删除后不复现');
  console.log(JSON.stringify({environment:base,identity:'isolated local fixtures; not production login',checks,completionMemory:'PASS'},null,2));
} finally {
  if(personalId) {
    const schedules=await call(A,'/api/schedules');
    const schedule=schedules.schedules.find(s=>s.id===personalId);
    if(schedule) await call(A,'/api/schedules','PATCH',{id:personalId,action:schedule.visibility==='personal'?'delete':'cancel'});
  }
  if(relationshipActive) await call(A,'/api/relationship/leave','POST',{});
}
