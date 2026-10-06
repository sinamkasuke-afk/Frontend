const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const sr=require('node:module').createRequire(path.join(__dirname,'package.json'));
const {chromium}=sr('playwright');
const {initializeApp}=sr('firebase-admin/app'),{getAuth}=sr('firebase-admin/auth'),{getFirestore,FieldValue,Timestamp}=sr('firebase-admin/firestore');
const root=path.resolve(__dirname,'..');
(async()=>{
 if(!process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('Refusing to run browser workflow outside emulators');
 const app=initializeApp({projectId:'demo-frms-rules'}),auth=getAuth(app),db=getFirestore(app);
 const services={auth,db,timestamp:()=>FieldValue.serverTimestamp(),expires:ms=>Timestamp.fromMillis(ms)};
 const apis={'/api/reservation-submit':require(root+'/api/reservation-submit.js').createHandler(services),'/api/admin-register':require(root+'/api/admin-register.js').createHandler(services),'/api/admin-invite':require(root+'/api/admin-invite.js').createHandler(services)};
 const admin=await auth.createUser({email:'browser-admin@example.com',password:'BrowserTest123!',displayName:'Browser Admin'});await auth.setCustomUserClaims(admin.uid,{admin:true});
 await db.collection('users').doc(admin.uid).set({uid:admin.uid,email:admin.email,displayName:'Browser Admin',role:'admin',studentId:'',enrollmentStatus:'approved',createdAt:FieldValue.serverTimestamp()});
 for(const [id,name]of[['social-hall','Social Hall'],['canteen','Canteen']])await db.collection('venues').doc(id).set({name,active:true,capacity:100,location:'Campus',order:0});
 for(const [id,label,startMinutes,endMinutes]of[['morning','7:00 AM – 10:00 AM',420,600],['midday','10:00 AM – 1:00 PM',600,780],['afternoon','1:00 PM – 4:00 PM',780,960]])await db.collection('timeSlots').doc(id).set({label,startMinutes,endMinutes,active:true});
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1:8087');
  if(apis[url.pathname]){let body='';for await(const chunk of req)body+=chunk;req.body=body?JSON.parse(body):{};res.status=code=>{res.statusCode=code;return res};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};await apis[url.pathname](req,res);return;}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404).end();}
 });await new Promise(r=>server.listen(8087,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[];
  async function context(viewport={width:1440,height:1000}){
   const ctx=await browser.newContext({viewport,timezoneId:'Asia/Manila'});
   await ctx.route('**/js/firebase/config.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.FIREBASE_CONFIG={apiKey:'demo-key',projectId:'demo-frms-rules',appId:'demo-app',authDomain:'demo-frms-rules.firebaseapp.com'};window.FRMS_DEMO_MODE=false;const originalInit=firebase.initializeApp;firebase.initializeApp=function(...args){const app=originalInit(...args);app.auth().useEmulator('http://127.0.0.1:9096',{disableWarnings:true});app.firestore().useEmulator('127.0.0.1',8086);return app;};`}));
   await ctx.route('https://firestore.googleapis.com/**',async route=>{const req=route.request();const url=new URL(req.url());const response=await fetch('http://127.0.0.1:8086'+url.pathname,{method:req.method(),headers:{'Content-Type':'application/json',Authorization:req.headers().authorization||''},body:req.postData()});await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});});
   ctx.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));return ctx;
  }
  const ac=await context(),sc=await context();const a=await ac.newPage(),s=await sc.newPage();const base='http://127.0.0.1:8087';
  await s.goto(base+'/login.html');await s.locator('#open-register').click();
  for(const[id,value]of[['register-name','Browser Student'],['register-student-id','2026-BROWSER'],['register-email','browser-student@gmail.com'],['register-password','BrowserTest123!'],['register-confirm','BrowserTest123!']])await s.locator('#'+id).fill(value);
  await s.locator('#register-submit').click();await s.waitForURL('**/dashboard.html');await s.getByText('Your student enrollment needs administrator approval').waitFor();
  await a.goto(base+'/admin-login.html');await a.locator('#admin-username').fill('browser-admin@example.com');await a.locator('#admin-password').fill('BrowserTest123!');await a.locator('#admin-login-form button[type=submit]').click();await a.waitForURL('**/admin-dashboard.html');
  await a.goto(base+'/admin-students.html');await a.getByRole('row').filter({hasText:'Browser Student'}).waitFor();a.on('dialog',dialog=>dialog.accept(dialog.type()==='prompt'?'2026-BROWSER':undefined));await a.getByRole('row').filter({hasText:'Browser Student'}).getByRole('button',{name:'Approve',exact:true}).click();
  await s.locator('#confirm-student-id').waitFor();await s.locator('#confirm-student-id').fill('WRONG');await s.getByRole('button',{name:'Confirm Student ID'}).click();await s.getByText('The student ID does not match').waitFor();await s.locator('#confirm-student-id').fill('2026-BROWSER');await s.getByRole('button',{name:'Confirm Student ID'}).click();await s.locator('#confirm-student-id').waitFor({state:'detached'});
  await s.goto(base+'/new-reservation-venue.html');await s.getByRole('button',{name:'Social Hall',exact:true}).click();
  const future=new Date(Date.now()+8*3600000+86400000);await s.locator('.calendar__day').filter({hasText:new RegExp('^'+future.getUTCDate()+'$')}).click();await s.getByLabel('Start hour',{exact:true}).fill('8');await s.getByLabel('End hour',{exact:true}).fill('8');await s.getByRole('button',{name:'Use this time',exact:true}).click();await s.locator('#next-button').click();await s.waitForURL('**/new-reservation-details.html');
  for(const[id,value]of[['event-name','Browser Workflow Event'],['organization','Test Club'],['event-type','Meeting'],['expected-guests','20'],['purpose','Browser integration test'],['contact-person','Browser Student'],['facility-requirements','None'],['setup-notes','None']])await s.locator('#'+id).fill(value);
  await s.locator('#reservation-details-form button[type=submit]').click();await s.waitForURL('**/new-reservation-review.html');await s.locator('#conditions-checkbox').check();await s.locator('#submit-reservation-button').click();await s.locator('#confirmation-submit').click();await s.locator('#success-modal').waitFor({state:'visible'});assert.equal(await s.locator('#submission-progress-bar').getAttribute('aria-valuenow'),'100');
  await a.goto(base+'/admin-requests.html');// Find the pending student request.
  const requestRow=a.getByRole('row').filter({hasText:'Browser Student'});await requestRow.getByRole('button',{name:'Approve',exact:false}).click();await requestRow.getByText('Approved',{exact:true}).waitFor();
  await s.goto(base+'/my-requests.html');await s.getByText('Approved',{exact:true}).first().waitFor();await s.locator('[data-reservation-id]').first().click();const modal=s.locator('#reservation-detail-dialog');await modal.waitFor({state:'visible'});
  const box=await modal.boundingBox();assert(Math.abs(box.x+box.width/2-720)<3);assert(Math.abs(box.y+box.height/2-500)<3);
  await s.keyboard.press('Escape');await modal.waitFor({state:'hidden'});
  await s.locator('[data-reservation-id]').first().click();s.on('dialog',dialog=>dialog.accept());await s.getByRole('button',{name:'Cancel reservation',exact:true}).click();await modal.waitFor({state:'hidden'});await s.getByText('Cancelled',{exact:true}).first().waitFor();
  await a.goto(base+'/admin-calendar.html');await a.locator('#next-month').click();await a.locator('#prev-month').click();
  let invitationCode; a.removeAllListeners('dialog');a.on('dialog',async dialog=>{if(dialog.message().startsWith('Email address'))await dialog.accept('invited-admin@example.com');else{invitationCode=dialog.defaultValue();await dialog.accept();}});
  await a.goto(base+'/admin-students.html');await a.getByRole('button',{name:'Invite Administrator'}).click();for(let i=0;i<50&&!invitationCode;i++)await new Promise(r=>setTimeout(r,100));assert(invitationCode);
  const nc=await context(),n=await nc.newPage();await n.goto(base+'/admin-login.html');await n.locator('#open-admin-register').click();for(const[id,value]of[['admin-register-name','Invited Admin'],['admin-register-email','invited-admin@example.com'],['admin-register-password','BrowserTest123!'],['admin-register-confirm','BrowserTest123!'],['admin-register-invitation',invitationCode]])await n.locator('#'+id).fill(value);await n.locator('#admin-register-submit').click();await n.waitForURL('**/admin-dashboard.html');
  await s.setViewportSize({width:390,height:844});await s.goto(base+'/my-requests.html');await s.locator('[data-reservation-id]').first().click();const mobile=await s.locator('#reservation-detail-dialog').boundingBox();assert(mobile.width<=390&&mobile.x>=0);await s.screenshot({path:'/tmp/frms-mobile-dialog.png'});
  assert.deepEqual(errors,[]);console.log('Browser workflow passed: registration, enrollment approval, ID mismatch/match, venue/date/slot selection, submission, progress, admin approval, student status, cancellation, centered desktop/mobile dialog, month navigation, admin invitation and invited signup. No page JavaScript errors.');
 }catch(error){if(browser){for(const ctx of browser.contexts())for(const page of ctx.pages()){console.log('BROWSER FAILURE PAGE:',page.url(),await page.locator('#firebase-error, #submission-error-message').allTextContents());await page.screenshot({path:'/tmp/frms-browser-failure-'+browser.contexts().indexOf(ctx)+'.png'}).catch(()=>{});}}throw error;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
