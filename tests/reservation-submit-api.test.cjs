const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/reservation-submit');
async function request({ authenticated = true, profile = {}, admin = false, method = 'POST' } = {}) {
  const handler = createHandler({ auth: { verifyIdToken: async () => { if (!authenticated) throw Error(); return { uid:'student' }; }, getUser:async()=>({uid:'student',email:'student@gmail.com',customClaims:{admin}}) }, db:{ collection:()=>({doc:()=>({get:async()=>({data:()=>profile})})}) },timestamp:()=> 'SERVER' });
  const result={};const res={setHeader(){},status(code){result.status=code;return this;},json(body){result.body=body;return result;}};
  await handler({method,headers:{authorization:'Bearer token'},body:{}},res);return result;
}
test('submission endpoint rejects unauthenticated users and wrong methods', async()=>{
  assert.equal((await request({authenticated:false})).status,401);
  assert.equal((await request({method:'GET'})).status,405);
});
test('submission endpoint requires approved enrollment and confirmed student ID',async()=>{
  for(const profile of [{},{role:'student',enrollmentStatus:'pending'},{role:'student',enrollmentStatus:'approved',studentId:'ID'},{role:'student',enrollmentStatus:'approved',studentId:'ID',confirmedStudentId:'wrong'}])assert.equal((await request({profile})).status,403);
});
