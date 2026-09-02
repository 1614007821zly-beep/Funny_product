// Explicit opt-in: uses free AI + AMap quotas through the local development API.
// No credentials here. Never run against a public deployment.
import assert from 'node:assert/strict';
const base='http://localhost:3000';
const headers={'content-type':'application/json','oai-authenticated-user-id':'local-ai-validation-20260831','oai-authenticated-user-email':'local-ai-validation@example.invalid'};
const input={city:'成都',moods:['想放松'],partnerMood:'',vibe:'安静',time:'今晚',budget:'¥100以内',space:'室内',special:'少走路，不喝酒',district:'天府广场',districtSource:'manual',radius:3000,longitude:104.072277,latitude:30.663436};
await fetch(`${base}/api/account`,{headers});
const started=Date.now();
const response=await fetch(`${base}/api/inspiration`,{method:'POST',headers,body:JSON.stringify(input),signal:AbortSignal.timeout(120000)});
const data=await response.json();
assert.equal(response.status,200,JSON.stringify(data));
const pool=[...(data.plans??[]),...(data.morePlans??[])];
assert.ok(pool.length>0,'No real candidates returned');
assert.ok(pool.every(p=>p.timeline.length===3&&p.includedPlaces.length===1));
assert.ok(pool.every(p=>p.estimatedCost===null||p.estimatedCost<=100));
assert.ok(pool.flatMap(p=>p.includedPlaces).every(p=>Number.isFinite(p.distance)&&p.distance<=3000));
// Independently verify that the API's distance uses the user's point, not AMap's keyword center.
for(const p of pool.flatMap(plan=>plan.includedPlaces)) {
  const [longitude,latitude]=p.location.split(',').map(Number);
  const rad=Math.PI/180;
  const a=Math.sin((latitude-input.latitude)*rad/2)**2+Math.cos(latitude*rad)*Math.cos(input.latitude*rad)*Math.sin((longitude-input.longitude)*rad/2)**2;
  const expected=12742000*Math.asin(Math.sqrt(a));
  assert.ok(Math.abs(p.distance-expected)<2,`Wrong distance origin: ${p.name}`);
}
assert.ok(pool.every(p=>/不安排步行往返/.test(p.timeline[2].description)));
assert.ok(pool.every(p=>!/散步|漫步|小酌|微醺/.test(p.title+p.summary)));
assert.equal(new Set(pool.flatMap(p=>p.includedPlaces.map(p=>p.id))).size,pool.length);
assert.ok(pool.flatMap(p=>p.includedPlaces).filter(p=>p.category==='书店').every(p=>/书店|书屋|书局|书城|图书馆|图书音像|bookstore/iu.test(p.name+p.type)));
console.log(JSON.stringify({seconds:(Date.now()-started)/1000,code:data.code??'AI_SUCCESS',source:data.source,plans:data.plans.length,reserve:data.morePlans.length,pool:data.pool,checks:'budget, radius, single venue, no walking itinerary, no duplicates passed',sample:data.plans[0]},null,2));
assert.ok(data.source?.ai?.includes('ox-alpha'),'Live response is fallback; AI integration not proven');
