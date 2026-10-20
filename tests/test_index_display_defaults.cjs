const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync(__dirname+'/../stock-monitor/display-defaults.js','utf8');
const cfg={instruments:[{ticker:'D05.SI',enabled:true,type:'Stock'},{ticker:'SPY',enabled:true,type:'ETF'},{ticker:'FUND',enabled:true,type:'Fund'}]};
function harness(page='index.html',pages={'index.html':{visibleTickers:[]}},fail=false){
 const events={},calls=[];
 const ctx={URL,Set,Date,console,document:{currentScript:{src:'https://myai118.github.io/digital-tools/stock-monitor/display-defaults.js'},getElementById(){return null;}},location:{pathname:'/digital-tools/stock-monitor/'+page},window:{addEventListener(name,fn){events[name]=fn;}},async fetch(url,opts){calls.push({url:String(url),opts});return {ok:!fail,json:async()=>({version:1,pages})};}};
 vm.createContext(ctx);vm.runInContext(code,ctx);return {api:ctx.window.StockMonitorDisplay,events,calls};
}
test('empty defaults hide every category on first and later visits',async()=>{
 for(let i=0;i<2;i++){const h=harness(),hidden=new Set();await h.api.initialise(cfg,hidden,()=>{});assert.deepEqual([...hidden].sort(),['D05.SI','FUND','SPY']);}
});
test('each page uses the owner list and refresh reasserts that list',async()=>{
 const pages={'index.html':{visibleTickers:['D05.SI']},'tools/kwc.html':{visibleTickers:['SPY']}};
 for(const [page,expected] of [['',['FUND','SPY']],['tools/kwc.html',['D05.SI','FUND']]]){const h=harness(page,pages),hidden=new Set();await h.api.initialise(cfg,hidden,()=>{});assert.deepEqual([...hidden].sort(),expected);hidden.clear();await h.api.initialise({...cfg,instruments:[...cfg.instruments,{ticker:'NEW',enabled:true}]},hidden,()=>{});assert.deepEqual([...hidden].sort(),[...expected,'NEW'].sort());assert.equal(h.calls.length,1);}
});
test('restored browser history reloads the owner list',async()=>{
 const h=harness(),hidden=new Set();await h.api.initialise(cfg,hidden,()=>{});hidden.clear();h.events.pageshow({persisted:true});await new Promise(resolve=>setImmediate(resolve));assert.equal(hidden.size,3);assert.equal(h.calls.length,2);
});
test('missing and invalid defaults fail without showing every ticker',async()=>{
 await assert.rejects(harness('index.html',{},true).api.initialise(cfg,new Set(),()=>{}),/unavailable/);
 await assert.rejects(harness('index.html',{}).api.initialise(cfg,new Set(),()=>{}),/No default ticker list/);
 await assert.rejects(harness('index.html',{'index.html':{visibleTickers:'all'}}).api.initialise(cfg,new Set(),()=>{}),/Invalid default ticker list/);
});
