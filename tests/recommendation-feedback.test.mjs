import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = fileURLToPath(new URL('../', import.meta.url));
const page = ts.createSourceFile('page.tsx', fs.readFileSync(`${root}/app/page.tsx`, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const route = ts.createSourceFile('route.ts', fs.readFileSync(`${root}/app/api/inspiration/route.ts`, 'utf8'), ts.ScriptTarget.Latest, true);
function named(nodes, name) {
  const node = nodes.find(n => n.name?.text === name || ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText() === name));
  assert.ok(node, `Missing source declaration: ${name}`);
  return node.getText();
}
function compile(source, bindings = {}) {
  return vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { AbortController, console, exports: {}, ...bindings });
}
const home = page.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'Home');
// Execute the shipped handlers with isolated state/network boundaries; this is not a DOM test.
const shared = compile(fs.readFileSync(`${root}/lib/recommendation-feedback.ts`, 'utf8') + '\nexports;');
const helpers = named(page.statements, 'toPlan');
const handlers = ['generate', 'replaceSelectedPlan', 'replacePlanBatch', 'dislikeCurrentPlan'].map(n => named(home.body.statements, n)).join('\n');
const create = compile(`
${helpers}
(function(initial, respond) {
  const state = { aiPlans: [], morePlans: [], seenPlaceIds: [], recommendationFeedback: emptyRecommendationFeedback(), selectedPlan: 0, selectedPlaceIndexes: [0,0,0], generationError: '', loadingFailed: false, screen: 'results', ...initial };
  const { aiPlans, morePlans, seenPlaceIds, recommendationFeedback, selectedPlan } = state;
  const eligibleMorePlans = selectUnseenPlans(morePlans, recommendationFeedback, seenPlaceIds);
  const currentPlan = aiPlans[selectedPlan];
  const choices = { time:'今晚', budget:'¥100–300', special:'', vibe:'安静', space:'都可以' };
  const myStates = ['想放松']; const hasRelationship = false; const inspirationCity = '成都';
  const locationPrefs = { district:'', districtSource:'none', radius:5000, longitude:104.08, latitude:30.65 };
  const requestController = { current:null }; const generationRefresh = { current:false };
  const setter = key => value => { state[key] = typeof value === 'function' ? value(state[key]) : value; };
  const setAiPlans=setter('aiPlans'), setMorePlans=setter('morePlans'), setSeenPlaceIds=setter('seenPlaceIds'), setRecommendationFeedback=setter('recommendationFeedback'), setSelectedPlan=setter('selectedPlan'), setSelectedPlaceIndexes=setter('selectedPlaceIndexes'), setGenerationError=setter('generationError'), setLoadingFailed=setter('loadingFailed'), setCandidatePool=setter('candidatePool'), setWeather=setter('weather'), setHasGenerated=setter('hasGenerated');
  const notices=[], requests=[], signals=[];
  const notify = text => notices.push(text); const go = screen => { state.screen=screen; };
  const fetch = async (url, options) => { requests.push(JSON.parse(options.body)); signals.push(options.signal); return { ok:true, json:async () => respond ? respond(requests.at(-1)) : ({ plans:[], morePlans:[] }) }; };
  ${handlers}
  return { state, notices, requests, signals, generationRefresh, generate, replaceSelectedPlan, replacePlanBatch, dislikeCurrentPlan, planAllowedByFeedback };
})`, shared);
const apiNames = ['requestFeedback','feedbackLimit','sanitizeInput','clean','finiteNumber','clampNumber','budgetBand','scoreCandidate','composePlacesForBudget','knownPlaceCost','brandKey','routeDistance','geographicDistance','validCoordinates','budgetMatchSummary','buildCandidateFallbackPlans'];
const api = compile(`${apiNames.map(n => named(route.statements, n)).join('\n')}\n({sanitizeInput, scoreCandidate, buildCandidateFallbackPlans, requestFeedback});`, shared);
function place(id, overrides={}) {
  return { id, name:`场所${id}`, category:'咖啡馆', distance:500, cost:'50', address:'', businessArea:'', rating:'4.5', openTimeToday:'', location:'104.08,30.65', recommendationReasons:[], score:50, ...overrides };
}
function plan(id, overrides={}) {
  const p = place(id);
  return { title:`方案${id}`, summary:'测试简介', desc:'测试简介', tone:'cream', timeline:[], places:[p], includedPlaces:[p], estimatedCost:150, ...overrides };
}
const empty = () => ({ placeIds:[], brands:[], categories:[], maxDistance:null, maxCost:null });
const initial = () => ({ aiPlans:[plan('a'),plan('b'),plan('c')], morePlans:Array.from({length:9},(_,i)=>plan(`next${i}`)), seenPlaceIds:['a','b','c'] });
const check = test;
const plain = value => JSON.parse(JSON.stringify(value));
  await check('换一个只替换当前项，消耗1个候选且不请求接口', () => {
    const h=create({...initial(),selectedPlan:1}); h.replaceSelectedPlan();
    assert.deepEqual(plain(h.state.aiPlans.map(p=>p.title)),['方案a','方案next0','方案c']);
    assert.equal(h.state.morePlans.length,8); assert.equal(h.requests.length,0);
  });
  await check('换一批消耗3个候选，重置选择且不请求接口', () => {
    const h=create({...initial(),selectedPlan:2}); h.replacePlanBatch();
    assert.equal(h.state.morePlans.length,6); assert.equal(h.state.selectedPlan,0); assert.equal(h.requests.length,0);
    assert.equal(new Set(h.state.aiPlans.flatMap(p=>p.places.map(x=>x.id))).size,3);
  });
  await check('9次连续换一个（每次重新渲染）没有重复或额外请求', () => {
    let state=initial(); const ids=[];
    for(let i=0;i<9;i++){ const h=create(state); h.replaceSelectedPlan(); state=plain(h.state); ids.push(state.aiPlans[0].places[0].id); assert.equal(h.requests.length,0); }
    assert.equal(new Set(ids).size,9); assert.equal(state.morePlans.length,0);
  });
  await check('本批过滤同品牌、未知价格、未知距离和已排除类别', () => {
    const h=create(initial());
    assert.equal(h.planAllowedByFeedback(plan('x',{places:[place('x',{name:'星巴克(新区店)'})],includedPlaces:[]}),{...empty(),brands:['星巴克']}),false);
    assert.equal(h.planAllowedByFeedback(plan('x',{estimatedCost:null}),{...empty(),maxCost:100}),false);
    assert.equal(h.planAllowedByFeedback(plan('x',{places:[place('x',{distance:null})],includedPlaces:[]}),{...empty(),maxDistance:1000}),false);
    assert.equal(h.planAllowedByFeedback(plan('x'),{...empty(),categories:['咖啡馆']}),false);
  });
  await check('5种反馈都会记录地点并从当前池更换方案', () => {
    for(const reason of ['太远','太贵','太普通','不符合状态','地点不合适']) {
      const next=plan('next',{places:[place('next',{category:'书店',distance:100})],includedPlaces:[],estimatedCost:50});
      const h=create({...initial(),morePlans:[next]}); h.dislikeCurrentPlan(reason);
      assert.ok(h.state.recommendationFeedback.placeIds.includes('a')); assert.equal(h.state.aiPlans[0].title,'方案next'); assert.equal(h.requests.length,0);
    }
  });
  for(const [name,feedback,replacement] of [
    ['耗尽后刷新：同品牌其他分店不重新展示',{...empty(),brands:['星巴克']},plan('fresh',{places:[place('fresh',{name:'星巴克(新店)'})],includedPlaces:[]})],
    ['耗尽后刷新：更远地点不重新展示',{...empty(),maxDistance:1000},plan('fresh',{places:[place('fresh',{distance:4000})],includedPlaces:[]})],
    ['耗尽后刷新：更贵方案不重新展示',{...empty(),maxCost:100},plan('fresh',{estimatedCost:250})],
  ]) await check(name,async()=>{
    const h=create({...initial(),morePlans:[],recommendationFeedback:feedback},()=>({plans:[replacement,plan('safe1',{estimatedCost:50}),plan('safe2',{estimatedCost:50})],morePlans:[]}));
    await h.generate(false,true);
    const forbidden=h.state.aiPlans.filter(p=>!h.planAllowedByFeedback(p,feedback));
    assert.equal(forbidden.length,0,`刷新后直接展示了 ${forbidden.length} 个不符合反馈的方案；提交字段：${Object.keys(h.requests[0]).join(',')}`);
  });
  await check('超过60个地点：请求有界，页面仍排除整个浏览历史',async()=>{
    const seen=Array.from({length:72},(_,i)=>`poi-${i}`);
    const sanitized=api.sanitizeInput({city:'成都',excludePlaceIds:seen});
    assert.equal(sanitized.excludePlaceIds.length,60);
    assert.equal(sanitized.excludePlaceIds.at(-1),'poi-71');
    const h=create({...initial(),morePlans:[],seenPlaceIds:seen},()=>({plans:[plan('poi-0'),plan('poi-71'),plan('fresh')],morePlans:[]}));
    await h.generate(false,true);
    assert.deepEqual(plain(h.state.aiPlans.flatMap(p=>p.places.map(x=>x.id))),['fresh']);
    assert.equal(h.requests[0].excludePlaceIds.length,60);
  });
  await check('太远反馈检查多地点方案中的每个地点',()=>{
    const h=create(initial());
    const p=plan('near',{places:[place('near',{distance:500})],includedPlaces:[place('near',{distance:500}),place('far',{distance:2500})]});
    assert.equal(h.planAllowedByFeedback(p,{...empty(),maxDistance:1000}),false,'主地点500m通过，但组合中的2500m地点没有参与反馈距离检查');
  });
  await check('¥100以内按单人/双人数量拒绝明确超预算地点',()=>{
    const solo=api.sanitizeInput({city:'成都',budget:'¥100以内'});
    const duo=api.sanitizeInput({city:'成都',budget:'¥100以内',partnerMood:'想放松'});
    assert.equal(api.scoreCandidate(place('x',{cost:'80'}),solo).budgetEligible,true);
    assert.equal(api.scoreCandidate(place('x',{cost:'80'}),duo).budgetEligible,false);
    assert.equal(api.scoreCandidate(place('x',{cost:'101'}),solo).budgetEligible,false);
  });
  await check('低预算规则池返回12个不同地点，不超预算（隔离数据）',()=>{
    const input=api.sanitizeInput({city:'成都',budget:'¥100以内',longitude:104.08,latitude:30.65,radius:3000});
    const candidates=Array.from({length:20},(_,i)=>place(`low${i}`,{cost:String(10+i)}));
    const result=api.buildCandidateFallbackPlans(input,candidates,12);
    assert.equal(result.length,12); assert.equal(new Set(result.flatMap(p=>p.includedPlaces.map(x=>x.id))).size,12);
    assert.ok(result.every(p=>p.estimatedCost<=100));
  });
  await check('快速重复生成会给前一次请求发送取消信号',async()=>{
    const h=create(initial(),()=>({plans:[plan('x'),plan('y'),plan('z')],morePlans:[]}));
    const first=h.generate(false,true); const second=h.generate(false,true);
    await Promise.all([first,second]);
    assert.equal(h.signals.length,2); assert.equal(h.signals[0].aborted,true); assert.equal(h.signals[1].aborted,false);
  });

await check('空池保持反馈和旧结果，显示可恢复提示且不自动反复请求', async () => {
  const feedback={...empty(),maxCost:100,brands:['星巴克']};
  const h=create({...initial(),morePlans:[],recommendationFeedback:feedback},()=>({plans:[],morePlans:[],code:'NO_MATCHING_PLACES'}));
  await h.generate(false,true);
  assert.equal(h.state.screen,'loading'); assert.equal(h.state.loadingFailed,true);
  assert.ok(h.state.generationError.includes('没有更多')); assert.equal(h.requests.length,1);
  assert.equal(h.generationRefresh.current,true);
  assert.equal(h.state.recommendationFeedback.maxCost,100);
  assert.equal(h.state.aiPlans[0].title,'方案a');
  await h.generate(false,h.generationRefresh.current);
  assert.equal(h.requests[1].maxCost,100);
  assert.deepEqual(plain(h.requests[1].excludeBrands),['星巴克']);
});

await check('补充失败时不退回不满足反馈的演示方案', async () => {
  const h=create({...initial(),morePlans:[],recommendationFeedback:{...empty(),maxCost:100}},()=>({code:'AI_CIRCUIT_OPEN'}));
  await h.generate(false,true);
  assert.equal(h.state.loadingFailed,true); assert.notEqual(h.state.aiPlans,null);
  assert.equal(h.requests.length,1);
});

await check('反馈更近使用整个当前组合的最远距离', () => {
  const current=plan('a',{places:[place('a',{distance:500})],includedPlaces:[place('a',{distance:500}),place('far',{distance:2500})]});
  const h=create({...initial(),aiPlans:[current],morePlans:[plan('next')]});
  h.dislikeCurrentPlan('太远');
  assert.equal(h.state.recommendationFeedback.maxDistance,2500);
});

await check('反馈参数正确传递，服务端与页面采用同一个过滤器', async () => {
  const feedback={placeIds:['old'],brands:['星巴克'],categories:['马术'],maxDistance:2500,maxCost:200};
  const h=create({...initial(),morePlans:[],recommendationFeedback:feedback},()=>({plans:[plan('fresh')],morePlans:[]}));
  await h.generate(false,true);
  const parsed=api.requestFeedback(api.sanitizeInput(h.requests[0]));
  assert.equal(parsed.maxDistance,2500); assert.equal(parsed.maxCost,200);
  assert.deepEqual(plain(parsed.brands),['星巴克']); assert.deepEqual(plain(parsed.categories),['马术']);
  assert.ok(parsed.placeIds.includes('old'));
});

await check('组合内距离未知不冒充满足更近反馈，返回批次也去重', () => {
  const unknown=plan('x',{includedPlaces:[place('x'),place('unknown',{distance:null})]});
  assert.equal(shared.planAllowedByFeedback(unknown,{...empty(),maxDistance:3000}),false);
  const combo=plan('c',{includedPlaces:[place('c'),place('used')]});
  assert.equal(shared.selectUnseenPlans([combo],empty(),['used']).length,0);
  assert.equal(shared.selectUnseenPlans([plan('x'),plan('x')],empty()).length,1);
});

await check('零阈值不被重置为无限制，错误输入不生成NaN限制', () => {
  const zero=api.sanitizeInput({city:'成都',maxDistance:0,maxCost:0});
  assert.equal(zero.maxDistance,0); assert.equal(zero.maxCost,0);
  const invalid=api.sanitizeInput({city:'成都',maxDistance:'bad',maxCost:-1});
  assert.equal(invalid.maxDistance,null); assert.equal(invalid.maxCost,null);
});

await check('用户调整条件重新生成会清空本次负反馈，但重试不会', async () => {
  const h=create({...initial(),recommendationFeedback:{...empty(),brands:['品牌'],maxCost:10}},()=>({plans:[plan('fresh')],morePlans:[]}));
  await h.generate(false,false);
  assert.equal(h.requests[0].maxCost,null); assert.equal(h.requests[0].excludeBrands.length,0);
  assert.equal(h.state.recommendationFeedback.brands.length,0);
});

await check('补充接口无新候选时，仍可展示池内剩余的合适方案', async () => {
  const h=create({...initial(),morePlans:[plan('remaining')]},()=>({plans:[],morePlans:[]}));
  await h.generate(false,true);
  assert.equal(h.state.loadingFailed,false); assert.equal(h.state.screen,'results');
  assert.deepEqual(plain(h.state.aiPlans.map(p=>p.title)),['方案remaining']);
  assert.equal(h.state.selectedPlan,0);
});

await check('所有返回结果均看过时提示耗尽，不覆盖旧结果或自动重试', async () => {
  const h=create({...initial(),morePlans:[]},()=>({plans:[plan('a'),plan('b'),plan('c')],morePlans:[]}));
  await h.generate(false,true);
  assert.equal(h.state.loadingFailed,true); assert.equal(h.requests.length,1);
  assert.equal(h.state.aiPlans[0].title,'方案a');
});

await check('更便宜反馈约束两地点总价，不能通过组合重新超出反馈价格', () => {
  const input=api.sanitizeInput({city:'成都',budget:'¥100–300',maxCost:100});
  const candidates=[place('a',{cost:'60'}),place('b',{cost:'70'})];
  const result=api.buildCandidateFallbackPlans(input,candidates,2);
  assert.equal(result.length,2); assert.ok(result.every(p=>p.estimatedCost<100));
  assert.ok(result.every(p=>p.budgetMatch==='under'));
});
