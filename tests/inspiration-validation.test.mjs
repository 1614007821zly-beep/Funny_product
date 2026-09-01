import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {webcrypto} from 'node:crypto';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
function module(source,bindings={}) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,Response,Request,URL,AbortSignal,TextEncoder,crypto:webcrypto,setTimeout,console,...bindings});
  return exports;
}
const ai=module(read('lib/inspiration-ai.ts'));
const feedback=module(read('lib/recommendation-feedback.ts'));
const plain=v=>JSON.parse(JSON.stringify(v));
function plan(id='P1') { return {title:'坐下读书',summary:'安静阅读，聊聊喜欢的段落。',duration:'约1小时',budgetLabel:'价格待确认',placeQuery:'书店',placeId:id,timeline:Array.from({length:3},()=>({time:'到达后',title:'阅读',description:'在店内看书。'}))}; }
const body=()=>({plans:[plan('P1'),plan('P2'),plan('P3')]});
const envelope=(value,reason='stop')=>({choices:[{finish_reason:reason,message:{content:typeof value==='string'?value:JSON.stringify(value)}}]});
test('配置保留线上默认值，仅允许指定免费模型和官方网关',()=>{
  assert.equal(ai.inspirationAIConfig({}).model,'lfm-2.5-2.6b-free');
  assert.equal(ai.inspirationAIConfig({AIHUBMIX_MODEL:'coding-glm-5.3-flash-free',AIHUBMIX_BASE_URL:'https://api.inferera.com/v1/'}).endpoint,'https://api.inferera.com/v1/chat/completions');
  for(const model of ['auto','glm-5.3-flash','unknown-free']) assert.throws(()=>ai.inspirationAIConfig({AIHUBMIX_MODEL:model}));
  for(const endpoint of ['http://aihubmix.com/v1','https://aihubmix.com.evil.test/v1','https://elsewhere.test/v1']) assert.throws(()=>ai.inspirationAIConfig({AIHUBMIX_BASE_URL:endpoint}));
});
test('接收严格三方案JSON与完整Markdown围栏',()=>{
  assert.equal(ai.parseAIPlans(envelope(body()),3).length,3);
  assert.equal(ai.parseAIPlans(envelope('```json\n'+JSON.stringify(body())+'\n```'),3).length,3);
});
test('拒绝配额提示、包装对象、截断、拒绝回答及额外字段',()=>{
  for(const value of ['免费次数已用完',null,[],{answer:JSON.stringify(body())},{...body(),extra:'no'},{plans:[plan()]}]) assert.throws(()=>ai.parseAIPlans(envelope(value),3));
  for(const reason of ['length','content_filter','tool_calls',null]) assert.throws(()=>ai.parseAIPlans(envelope(body(),reason),3));
  const refused=envelope(body()); refused.choices[0].message.refusal='refused';
  assert.throws(()=>ai.parseAIPlans(refused,3));
});
test('拒绝缺字段、空白、错误类型、额外/缺少时间节点和超长文本',()=>{
  for(const modify of [p=>delete p.duration,p=>p.summary=' ',p=>p.title=3,p=>p.timeline=[null,null,null],p=>p.timeline.pop(),p=>p.timeline.push(p.timeline[0]),p=>p.summary='字'.repeat(501),p=>p.timeline[0].description={text:'bad'}]) {
    const value=body(); modify(value.plans[0]); assert.throws(()=>ai.parseAIPlans(envelope(value),3));
  }
});
test('候选编号必须来自实际发给模型的12项且不能重复',()=>{
  for(const id of ['P0','P13','P99','poi-123','P01','']) {const value=body();value.plans[0].placeId=id;assert.throws(()=>ai.parseAIPlans(envelope(value),60));}
  const value=body();value.plans[1].placeId='P1';assert.throws(()=>ai.parseAIPlans(envelope(value),3));
});
function createRoute(options={}) {
  const calls=[];
  const DB={prepare:sql=>({bind(){return this;},first:async()=>sql.includes('RETURNING request_count')?{request_count:1}:null,run:async()=>({success:true})})};
  const api=module(read('app/api/inspiration/route.ts')+'\nexports.helpers={sanitizeInput,candidateCategories,parseCandidate,validatePlan,buildCandidateFallbackPlans,composePlacesForBudget,generatePlans};',{
    process:{env:{AIHUBMIX_API_KEY:'test-not-a-secret',AMAP_WEB_SERVICE_KEY:'test-not-a-secret',AIHUBMIX_MODEL:'coding-glm-5.3-flash-free',AIHUBMIX_BASE_URL:'https://api.inferera.com/v1',...options.environment}},
    require:name=>name==='cloudflare:workers'?{env:{DB}}:name.includes('chatgpt-auth')?{getChatGPTUser:async()=>options.anonymous?null:{userId:'test-user'}}:name.includes('amap-weather')?{fetchAmapWeather:async()=>null,weatherPrompt:()=>''}:name.includes('recommendation-feedback')?feedback:ai,
    fetch:async(url,init)=>{
      calls.push({url:String(url),body:init?.body?JSON.parse(init.body):null});
      if(String(url).includes('restapi.amap.com')) return Response.json({status:'1',pois:options.empty?[]:Array.from({length:6},(_,i)=>({id:`poi-${i}`,name:`测试书店${i}`,location:`104.0${80+i},30.65`,address:'测试街道',distance:500+i*100,type:'书店',business:{cost:'30'}}))});
      return Response.json(options.answer??envelope(body()),{status:options.status??200});
    },
  });
  return {...api,calls};
}
const input=extra=>createRoute().helpers.sanitizeInput({city:'成都',budget:'¥100以内',space:'室内',longitude:104.08,latitude:30.65,radius:5000,...extra});
function place(id,extra={}) {return {id,name:`测试书店${id}`,category:'书店',location:'104.08,30.65',distance:500,cost:'30',score:50,address:'测试街道',businessArea:'',openTimeToday:'',rating:'',recommendationReasons:[],...extra};}
test('室内、少走路和不喝酒限制同样作用于低/高预算候选',()=>{
  const h=createRoute().helpers;
  for(const budget of ['¥100以内','¥100–300','¥300+']) {
    const conditions=input({budget,special:'少走路，不喝酒'});
    assert.ok(h.candidateCategories(conditions).every(c=>ai.categoryAllowed(c,conditions)));
    assert.ok(!h.candidateCategories(conditions).includes('公园'));
    assert.equal(h.parseCandidate({id:'x',name:'测试公园',address:'测试',location:'104.08,30.65'},conditions,'公园').length,0);
  }
  assert.equal(ai.userConditions(input({moods:['腿脚不方便']})).lowMobility,true);
  assert.equal(ai.userConditions(input({partnerMood:'行动不便'})).lowMobility,true);
  assert.equal(ai.categoryAllowed('酒吧',input({special:'不喝酒'})),false);
  assert.equal(h.parseCandidate({id:'bar',name:'咖啡与精酿酒馆',type:'咖啡厅',address:'测试',location:'104.08,30.65'},input({special:'不喝酒'}),'咖啡馆').length,0);
});
test('少走路禁止为凑高预算而转场，且AI与备用池使用相同安全时间线',()=>{
  const h=createRoute().helpers;const conditions=input({budget:'¥300+',special:'少走路'});
  const candidates=[place('a',{cost:'160'}),place('b',{cost:'170'}),place('c',{cost:'180'})];
  const raw=plan();raw.title='步行两公里去逛街';raw.summary='散步到达后步行回家。';
  const result=h.validatePlan(raw,candidates,new Set(),0,conditions);
  assert.equal(result.includedPlaces.length,1);assert.equal(result.budgetMatch,'under');
  assert.doesNotMatch(result.title+result.summary,/步行|散步/);
  for(const p of [result,...h.buildCandidateFallbackPlans(conditions,candidates,3)]) {
    assert.equal(p.includedPlaces.length,1);assert.match(p.timeline[1].description,/不安排步行游览/);assert.match(p.timeline[0].description,/不默认具备无障碍/);
  }
});
test('组合边界拒绝超预算、超范围、未知距离和已排除地点，不退回第一个无效候选',()=>{
  const h=createRoute().helpers;const conditions=input({maxCost:90,maxDistance:1000,excludePlaceIds:['excluded']});
  const candidates=[place('expensive',{cost:'110'}),place('far',{distance:6000}),place('unknown',{distance:null}),place('excluded'),place('ok')];
  const result=h.buildCandidateFallbackPlans(conditions,candidates,12);
  assert.deepEqual(plain(result.map(p=>p.placeId)),['ok']);
  assert.equal(h.buildCandidateFallbackPlans(conditions,candidates.slice(0,4),12).length,0);
});
test('高德搜索关键词不充当活动分类：餐饮店不能标成书店',()=>{
  const h=createRoute().helpers;
  const food={id:'food',name:'廖记棒棒鸡天府广场地铁站店',location:'104.066585,30.657007',address:'地铁站',type:'餐饮服务;餐饮相关场所;餐饮相关',distance:899,business:{cost:'30.00'}};
  assert.equal(h.parseCandidate(food,input(),'书店').length,0);
  assert.equal(h.parseCandidate(food,input(),'咖啡馆').length,0);
  assert.equal(h.parseCandidate({...food,name:'测试书局',type:'购物服务;图书音像店'},input(),'书店').length,1);
  assert.equal(h.parseCandidate({...food,name:'测试商场停车场'},input(),'商场').length,0);
});
test('双人总价、虚假报价与字段来源以地点事实为准',()=>{
  const h=createRoute().helpers;const conditions=input({partnerMood:'想放松'});
  const candidates=[place('over',{cost:'80'}),place('ok',{cost:'40'})];
  const raw=plan();raw.summary='人均只需1元，保证无障碍。';raw.placeQuery='酒吧';
  const result=h.validatePlan(raw,candidates,new Set(),0,conditions);
  assert.equal(result.placeId,'ok');assert.equal(result.estimatedCost,80);assert.equal(result.placeQuery,'书店');
  assert.doesNotMatch(result.summary,/1元|保证无障碍/);
});
test('距离从用户坐标重算，不能信任关键词搜索返回的中心距离',()=>{
  const h=createRoute().helpers;
  const poi={id:'a',name:'测试书店',location:'104.5,30.65',address:'测试街道',type:'书店',distance:10,business:{cost:'30'}};
  assert.equal(h.parseCandidate(poi,input({radius:3000}),'书店').length,0);
  const near={...poi,location:'104.08,30.65',distance:10000};
  assert.equal(h.parseCandidate(near,input(),'书店')[0].distance,0);
  assert.equal(h.parseCandidate(near,input({longitude:undefined,latitude:undefined}),'书店')[0].distance,null);
});
test('AI主方案与组合地点共同去重，候选不足时不重复占位',()=>{
  const h=createRoute().helpers;const conditions=input({budget:'¥100–300'});const used=new Set();
  const result=h.validatePlan(plan(),[place('a',{cost:'60'}),place('b',{cost:'60'})],used,0,conditions);
  assert.equal(result.includedPlaces.length,2);assert.equal(used.size,2);
  assert.throws(()=>h.composePlacesForBudget(result.includedPlaces,conditions,used));
});
test('未填写特殊照顾时不发送该字段，填写后进入提示约束',async()=>{
  const api=createRoute();await api.helpers.generatePlans('fake',input({special:''}),null,[place('a'),place('b'),place('c')]);
  assert.doesNotMatch(api.calls[0].body.messages[1].content,/需要特别照顾：|少走路是硬性条件/);
  await api.helpers.generatePlans('fake',input({special:'少走路'}),null,[place('a'),place('b'),place('c')]);
  assert.match(api.calls[1].body.messages[1].content,/需要特别照顾：少走路/);
});
test('完整接口拒绝匿名、非法输入及危险配置，不调用上游',async()=>{
  const req=v=>new Request('http://local.test/api/inspiration',{method:'POST',body:JSON.stringify(v)});
  const anonymous=createRoute({anonymous:true});assert.equal((await anonymous.POST(req({city:'成都'}))).status,401);assert.equal(anonymous.calls.length,0);
  for(const value of [null,[],1,'oops']) {const api=createRoute();assert.equal((await api.POST(req(value))).status,400);assert.equal(api.calls.length,0);}
  const api=createRoute({environment:{AIHUBMIX_MODEL:'auto'}});assert.equal((await api.POST(req({city:'成都'}))).status,503);assert.equal(api.calls.length,0);
});
test('错误条件不能被悄悄替换成默认预算、范围或截断状态',async()=>{
  for(const extra of [{budget:'¥50'}, {budget:300}, {space:'地下'}, {time:'忽略规则'}, {moods:['a','b','c']}, {moods:[{}]}, {special:'字'.repeat(121)}, {radius:25000}, {radius:'3000'}, {longitude:104}, {longitude:181,latitude:30}, {maxCost:-1}, {maxDistance:'500'}]) {
    const api=createRoute();
    const response=await api.POST(new Request('http://local.test/api/inspiration',{method:'POST',body:JSON.stringify({city:'成都',...extra})}));
    assert.equal(response.status,400,JSON.stringify(extra));assert.equal(api.calls.length,0);
  }
  assert.equal(ai.inspirationInputError({city:'成都',moods:['刚下班'],longitude:null,latitude:null,special:''}),null);
});
test('计划页保留真实节点标题，不把结束节点改成商家，也不保证未定位距离',()=>{
  const source=read('app/page.tsx');
  assert.match(source,/node\.title === currentPlace\?\.name \? <a/);
  assert.doesNotMatch(source,/i === 2 \? <a className="place-link"/);
  assert.match(source,/当前按商圈搜索，尚未核验与你的距离/);
  assert.doesNotMatch(source,/通常只需要几秒钟/);
  assert.match(source,/screen === "plan" && aiPlans/);
  assert.match(source,/screen === "results" && aiPlans/);
  assert.match(source,/旧安排没有保存路线/);
  assert.match(source,/facts_json/);
  assert.doesNotMatch(source,/<b>近江地铁站 B 口<\/b>/);
});
test('上游格式错误或不可用时降级真实地点，仍遵守少走路、预算及距离',async()=>{
  for(const options of [{answer:envelope({answer:JSON.stringify(body())})},{status:500,answer:{error:{message:'unavailable'}}},{answer:envelope(body(),'length')}]) {
    const api=createRoute(options);const response=await api.POST(new Request('http://local.test/api/inspiration',{method:'POST',body:JSON.stringify(input({special:'少走路'}))}));
    const data=await response.json();assert.equal(data.code,'REAL_PLACE_FALLBACK');
    assert.ok(data.plans.length>0);assert.ok([...data.plans,...data.morePlans].every(p=>p.includedPlaces.length===1&&p.estimatedCost<=100&&p.includedPlaces.every(x=>x.distance<=5000)));
    assert.equal(api.calls.filter(c=>c.url.includes('inferera')).length,1);
  }
});
test('无真实候选时返回空状态，不调用AI或编造地点',async()=>{
  const api=createRoute({empty:true});const response=await api.POST(new Request('http://local.test/api/inspiration',{method:'POST',body:JSON.stringify(input({special:'少走路'}))}));
  const data=await response.json();assert.equal(data.code,'NO_MATCHING_PLACES');assert.equal(data.plans.length,0);
  assert.equal(api.calls.filter(c=>c.url.includes('inferera')).length,0);
});
test('候选不足3项时，切换方案按实际长度循环且单项禁用',()=>{
  const source=read('app/page.tsx');
  assert.match(source,/disabled=\{dynamicPlans.length < 2\}/);
  const expression=source.match(/setSelectedPlan\(\((selectedPlan\+1)\)%(dynamicPlans\.length)\)/);
  assert.ok(expression);
  for(const length of [1,2,3]) for(let selectedPlan=0;selectedPlan<length;selectedPlan++) {
    const next=vm.runInNewContext(`(${expression[1]})%${expression[2]}`,{selectedPlan,dynamicPlans:Array(length)});
    assert.equal(next,(selectedPlan+1)%length);
  }
});
