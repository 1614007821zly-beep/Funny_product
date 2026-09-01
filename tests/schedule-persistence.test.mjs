import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=fs.readFileSync(`${root}/lib/schedule-facts.ts`,'utf8');
const api=vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText+'\nexports;',{exports:{},JSON,Date,Intl,Number});

test('安排快照只接受有界、可还原的事实',()=>{
  const valid={version:1,title:'真实计划',city:'成都',summary:'说明',duration:'2小时',budgetPreference:'¥100–300',priceNote:'约¥120',capturedAt:'2026-09-01T00:00:00.000Z',timeline:[{time:'18:00',title:'书店',description:'见面'}],places:[{id:'p1',name:'书店',address:'地址',location:'104.08,30.65',cost:'60',openTimeToday:'',distance:500}]};
  assert.equal(api.normalizeScheduleFacts(valid).places[0].name,'书店');
  assert.equal(api.normalizeScheduleFacts({...valid,version:2}),null);
  assert.equal(api.normalizeScheduleFacts({...valid,timeline:Array(13).fill(valid.timeline[0])}),null);
  assert.equal(api.normalizeScheduleFacts({...valid,places:[{...valid.places[0],location:'javascript:bad'}]}).places[0].location,'');
  assert.equal(api.readScheduleFacts('{bad'),null);
});

test('完成时间按上海时区的安排开始时刻判断',()=>{
  const start=Date.parse('2026-09-01T18:30:00+08:00');
  assert.equal(api.hasScheduleStarted('2026-09-01','18:30',start-1),false);
  assert.equal(api.hasScheduleStarted('2026-09-01','18:30',start),true);
  assert.equal(api.hasScheduleStarted('bad','18:30',start),false);
});

test('天气、完成和回忆链路不再依赖模拟状态',()=>{
  const page=fs.readFileSync(`${root}/app/page.tsx`,'utf8');
  const schedules=fs.readFileSync(`${root}/app/api/schedules/route.ts`,'utf8');
  const memories=fs.readFileSync(`${root}/app/api/memories/route.ts`,'utf8');
  const migration=fs.readFileSync(`${root}/drizzle/0008_uneven_kree.sql`,'utf8');
  assert.match(page,/const requestId = \+\+weatherRequest\.current/);
  assert.match(page,/requestId !== weatherRequest\.current \|\| data\.weather\.queryCity !== city/);
  assert.match(page,/weather\?\.queryCity === displayedInspirationCity/);
  assert.doesNotMatch(page,/模拟 TA 确认完成/);
  assert.match(schedules,/env\.DB\.batch\(statements\)/);
  assert.match(schedules,/INSERT OR IGNORE INTO memories/);
  assert.match(schedules,/hasScheduleStarted/);
  assert.match(memories,/owner_user_id=\?/);
  assert.match(memories,/contribution_shared=0/);
  assert.match(migration,/CREATE TABLE `memories`/);
});
