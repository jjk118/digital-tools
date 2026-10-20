const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// Minimal DOM used to execute the real monitor scripts without a network/browser dependency.
class Element{
 constructor(tag,attrs={}){this.tagName=tag.toLowerCase();this.attrs=attrs;this.children=[];this.parentElement=null;this.style={};this.dataset={};this._text='';this.hidden=false;this.events={};for(const [k,v]of Object.entries(attrs)){if(k==='id')this.id=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=v;}this.className=attrs.class||'';this.classList={contains:c=>this.className.split(/\s+/).includes(c),toggle:(c,on)=>{const set=new Set(this.className.split(/\s+/).filter(Boolean));if(on===undefined)on=!set.has(c);on?set.add(c):set.delete(c);this.className=[...set].join(' ');},add:c=>this.classList.toggle(c,true),remove:c=>this.classList.toggle(c,false)};}
 append(...nodes){for(let node of nodes){if(typeof node==='string'){const n=new Element('#text');n._text=node;node=n;}if(node.parentElement)node.parentElement.children=node.parentElement.children.filter(x=>x!==node);node.parentElement=this;this.children.push(node);}}
 replaceChildren(...nodes){for(const n of this.children)n.parentElement=null;this.children=[];this._text='';this.append(...nodes);}
 set textContent(value){this.replaceChildren();this._text=String(value??'');}get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
 set innerHTML(html){this.replaceChildren(...parse(html).children);}get innerHTML(){return this.textContent;}
 setAttribute(name,value){this.attrs[name]=String(value);if(name==='id')this.id=value;}
 getAttribute(name){return name==='id'?this.id||null:this.attrs[name]??null;}
 matches(selector){const attr=selector.match(/\[([^=\]]+)(?:="([^\"]*)")?\]/),base=selector.replace(/\[.*?\]/g,'');let ok=!base||base==='*'||base[0]==='#'&&this.id===base.slice(1)||base[0]==='.'&&this.classList.contains(base.slice(1))||base===this.tagName;if(attr){const val=attr[1].startsWith('data-')?this.dataset[attr[1].slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]:this.getAttribute(attr[1]);ok=ok&&val!==null&&val!==undefined&&(attr[2]===undefined||val===attr[2]);}return ok;}
 querySelectorAll(selector){const parts=selector.trim().split(/\s+/);let found=[];const walk=node=>{for(const child of node.children){if(child.matches(parts.at(-1))){let parent=child.parentElement,i=parts.length-2;while(i>=0&&parent){if(parent.matches(parts[i]))i--;parent=parent.parentElement;}if(i<0)found.push(child);}walk(child);}};walk(this);return found;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}closest(s){let p=this;while(p){if(p.matches(s))return p;p=p.parentElement;}return null;}
 addEventListener(name,handler){(this.events[name]||=[]).push(handler);}click(){const event={preventDefault(){}};this.onclick?.(event);for(const fn of this.events.click||[])fn(event);}scrollIntoView(){}
 insertAdjacentElement(where,node){const p=this.parentElement;if(where!=='afterend'||!p)throw Error('Unsupported insertion');node.parentElement=p;p.children.splice(p.children.indexOf(this)+1,0,node);}
}
function parse(html){const root=new Element('#document'),stack=[root];html=html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');for(const token of html.match(/<[^>]*>|[^<]+/g)||[]){if(token.startsWith('<!'))continue;if(token.startsWith('</')){const tag=token.slice(2,-1).trim().toLowerCase();let index=stack.length-1;while(index>0&&stack[index].tagName!==tag)index--;if(index>0)stack.length=index;continue;}if(token.startsWith('<')){const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;const attrs={};for(const m of token.matchAll(/([\w-]+)="([^\"]*)"/g))attrs[m[1]]=m[2];const el=new Element(tag,attrs);stack.at(-1).append(el);if(!['meta','link','input','br','img','hr'].includes(tag))stack.push(el);}else{const n=new Element('#text');n._text=token;stack.at(-1).append(n);}}return root;}
const root=require('node:path').resolve(__dirname,'..'),read=p=>fs.readFileSync(root+'/'+p,'utf8');
const defaults={version:1,pages:{'index.html':{visibleTickers:[]}}};
function loadPage(key){const doc=parse(read('stock-monitor/'+key));doc.createElement=tag=>new Element(tag);doc.getElementById=id=>doc.querySelector('#'+id);doc.currentScript={src:'https://myai118.github.io/digital-tools/stock-monitor/display-defaults.js'};
 const ctx={document:doc,location:{href:'https://myai118.github.io/digital-tools/stock-monitor/'+key,pathname:'/digital-tools/stock-monitor/'+key,hash:''},URL,TextEncoder,TextDecoder,Uint8Array,atob,btoa,console,Blob,AbortController,setInterval(){return 1;},clearInterval(){},setTimeout(){},clearTimeout(){},addEventListener(){},navigator:{userAgent:'test',maxTouchPoints:0},localStorage:{getItem(){throw Error('Must ignore old visitor preferences');},setItem(){throw Error('Must not persist visitor preferences');}},async fetch(url){let p=String(url),data;if(p.includes('stock-monitor-display-defaults.json'))data=defaults;else if(p.includes('stock-tickers.json'))data=JSON.parse(read('data/stock-tickers.json'));else if(p.includes('dividend-data.json'))data=JSON.parse(read('dividend-data.json'));else if(p.includes('market-data.json'))data=JSON.parse(read('market-data.json'));else throw Error('Unexpected request '+p);return {ok:true,json:async()=>structuredClone(data)};}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(read('stock-monitor/display-defaults.js'),ctx);const script=key==='index-funds.html'?'stock-monitor/funds-monitor.js':key.startsWith('tools/')?'stock-monitor/tools/monitor.js':'stock-monitor/monitor-index-defaults.js';vm.runInContext(read(script),ctx);return {ctx,doc};}
async function ready(doc){for(let i=0;i<20;i++){if(doc.getElementById('status').textContent.includes('Latest'))return;await new Promise(resolve=>setImmediate(resolve));}assert.fail(doc.getElementById('status').textContent);}
test('main index monitor loads empty, allow temporary selections and reset on a new visit',async()=>{
 for(const key of Object.keys(defaults.pages)){
  const {ctx,doc}=loadPage(key);await ready(doc);assert.equal(doc.querySelectorAll('tr[data-ticker]').length,0,key+' must start empty');assert.equal(doc.getElementById('displayEmptyState'),null,key+' must not show a Settings prompt');
  const attempts=['wrong',null,'index','index'];let prompts=0,alerts=0;ctx.prompt=()=>{prompts++;return attempts.shift();};ctx.alert=()=>alerts++;
  const dot=doc.getElementById('settingsLink'),panel=doc.getElementById('settingsPanel');
  dot.click();assert.equal(panel.classList.contains('open'),false,'wrong password must not open settings');assert.equal(alerts,1);
  dot.click();assert.equal(panel.classList.contains('open'),false,'cancel must keep settings closed');
  dot.click();assert.ok(panel.classList.contains('open'),key+' correct filename password must open Settings');
  doc.getElementById('settingsCloseButton').click();assert.equal(prompts,3,'closing must not ask for password');
  dot.click();assert.equal(prompts,4,'every reopening must ask again');assert.equal(panel.classList.contains('open'),true);
  const check=doc.getElementById('settingsList').querySelector('input');assert.ok(check,key+' must list selectable tickers');check.checked=true;check.onchange();assert.equal(doc.querySelectorAll('tr[data-ticker]').length,1,key+' must show selected ticker');assert.equal(doc.getElementById('displayEmptyState'),null);
  await (key==='index-funds.html'?ctx.refreshFunds():ctx.refresh());assert.equal(doc.querySelectorAll('tr[data-ticker]').length,1,key+' retains selection on data update');
  for(const [path,password] of [['/stock-monitor/tools/kwc.html','kwc'],['/stock-monitor/index-funds.html','index-funds'],['/stock-monitor/','index']]){
   ctx.toggleSettings(false);ctx.location.pathname=path;ctx.prompt=()=>password;dot.click();assert.equal(panel.classList.contains('open'),true,path+' derives its password from the filename');
  }
  const next=loadPage(key);await ready(next.doc);assert.equal(next.doc.querySelectorAll('tr[data-ticker]').length,0,key+' resets next visit');
 }
});

