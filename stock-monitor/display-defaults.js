'use strict';
// Owner defaults are shared in GitHub. Visitor changes live only in this page's memory.
window.StockMonitorDisplay = (() => {
 const scriptURL = new URL(document.currentScript.src);
 const root = new URL('../', scriptURL);
 const configPath = 'data/stock-monitor-display-defaults.json';
 const configURL = new URL(configPath, root);
 const api = 'https://api.github.com/repos/myai118/digital-tools';
 const relative = location.pathname.slice(root.pathname.length);
 const pageKey = relative.replace(/^stock-monitor\//, '') || 'index.html';
 const key = pageKey.endsWith('/') ? pageKey + 'index.html' : pageKey;
 let loading = null, loaded = false, entry = null, known = new Set();
 let hidden, config, redraw, credential = '', mounted = false, saving = false;
 function updateVisibility(count) {
  let note = document.getElementById('displayEmptyState');
  if (!note) {
   note = document.createElement('div'); note.id = 'displayEmptyState'; note.className = 'notice display-empty';
   const text = document.createElement('p'); text.textContent = 'All tickers are hidden. Open Settings to choose what to show during this visit.';
   const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Open Settings';
   button.onclick = () => (document.getElementById('settingsLink') || document.getElementById('settingsButton')).click();
   note.append(text, button); document.querySelector('.bar').insertAdjacentElement('afterend', note);
  }
  note.hidden = count > 0;
 }
 const copy = value => value == null ? null : JSON.parse(JSON.stringify(value));
 const clean = value => [...new Set(value.map(x => String(x).trim().toUpperCase()))].sort();
 const decode = value => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g, '')), c => c.charCodeAt(0))));
 const encode = value => { let binary = ''; for (const byte of new TextEncoder().encode(JSON.stringify(value, null, 2) + '\n')) binary += String.fromCharCode(byte); return btoa(binary); };
 function validateDocument(data) {
  if (!data || data.version !== 1 || !data.pages || typeof data.pages !== 'object' || Array.isArray(data.pages)) throw Error('Invalid default display settings.');
  for (const item of Object.values(data.pages)) if (!item || !Array.isArray(item.visibleTickers) || item.visibleTickers.some(t => typeof t !== 'string')) throw Error('Invalid default ticker list.');
  return data;
 }
 async function request(path, options = {}) {
  const response = await fetch(api + path, {...options, cache:'no-store', headers:{Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28', ...(credential ? {Authorization:'Bearer ' + credential} : {}), ...(options.headers || {})}});
  if (!response.ok) throw Error('GitHub returned ' + response.status + '. Check repository access and Contents read/write permission.');
  return response.json();
 }
 function active() { return (config.instruments || []).filter(x => x.enabled); }
 function applyDefaults() {
  const selected = new Set(entry ? entry.visibleTickers : active().map(x => x.ticker));
  hidden.clear();
  for (const row of config.instruments || []) if (!selected.has(row.ticker)) hidden.add(row.ticker);
 }
 function status(message) { const node = document.getElementById('ownerDefaultsStatus'); if (node) node.textContent = message; }
 function mount() {
  const panel = document.getElementById('settingsPanel');
  if (mounted || !panel) return;
  mounted = true;
  const box = document.createElement('details'); box.className = 'owner-defaults';
  box.innerHTML = '<summary>Owner defaults for this page</summary><p>Select tickers using the checkboxes above, then save that selection as the default for every visitor. Each new page load starts with your saved list.</p><p><label>GitHub token <input type="password" autocomplete="off" spellcheck="false" aria-label="Default settings GitHub token"></label></p><div class="settings-actions"><button type="button" data-action="connect">Connect GitHub</button><button type="button" data-action="disconnect">Disconnect</button><button type="button" data-action="save" disabled>Save current selection as defaults</button></div><p id="ownerDefaultsStatus" role="status">Not connected. Use a token restricted to myai118/digital-tools with Contents read/write permission. The token stays only in this tab until disconnect or reload. Never share it in chat.</p>';
  panel.append(box);
  const input = box.querySelector('input'), save = box.querySelector('[data-action="save"]'), connect = box.querySelector('[data-action="connect"]');
  connect.onclick = async () => {
   const token = input.value.trim(); input.value = '';
   if (!token) { status('Enter your GitHub token directly here.'); return; }
   credential = token; connect.disabled = true;
   try { await request(''); save.disabled = false; status('Connected. Save defaults updates this page for everyone.'); }
   catch (error) { credential = ''; save.disabled = true; status(error.message); }
   finally { connect.disabled = false; }
  };
  box.querySelector('[data-action="disconnect"]').onclick = () => { credential = ''; input.value = ''; save.disabled = true; status('Disconnected. Token cleared.'); };
  save.onclick = async () => {
   if (saving || !credential) return;
   saving = true; save.disabled = true; status('Saving defaults for ' + key + '…');
   // Capture the selection now, before waiting on the network.
   const visibleTickers = clean(active().filter(x => !hidden.has(x.ticker)).map(x => x.ticker));
   try {
    const current = await request('/contents/' + configPath + '?ref=main&ts=' + Date.now());
    const data = validateDocument(decode(current.content));
    if (JSON.stringify(data.pages[key] || null) !== JSON.stringify(entry)) throw Error('This page\'s defaults changed elsewhere. Reload before saving.');
    const next = {visibleTickers, savedAt:new Date().toISOString()};
    data.pages[key] = next;
    const result = await request('/contents/' + configPath, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message:'Set default tickers for stock-monitor/' + key, branch:'main', sha:current.sha, content:encode(data)})});
    if (!result.commit || !result.commit.sha) throw Error('GitHub did not confirm the save.');
    entry = copy(next);
    status('Saved ' + visibleTickers.length + ' default tickers for this page. New visits will use them after publication finishes, usually within a few minutes.');
   } catch (error) { status('Defaults were not saved. ' + error.message); }
   finally { saving = false; save.disabled = !credential; }
  };
  const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'Reset to owner defaults';
  reset.onclick = () => { applyDefaults(); redraw(); };
  panel.querySelector('.settings-actions').append(reset);
 }
 async function initialise(cfg, hiddenSet, rerender) {
  config = cfg; hidden = hiddenSet; redraw = rerender;
  if (!loaded) {
   if (!loading) loading = (async () => {
    const url = new URL(configURL); url.searchParams.set('ts', Date.now());
    const response = await fetch(url, {cache:'no-store'});
    if (!response.ok) throw Error('Default display settings unavailable. Please reload this page.');
    const data = validateDocument(await response.json());
    if (!Object.hasOwn(data.pages, key)) throw Error('No default ticker list has been configured for this page.');
    entry = copy(data.pages[key]);
    applyDefaults(); known = new Set((cfg.instruments || []).map(x => x.ticker)); loaded = true;
   })().catch(error => { loading = null; throw error; });
   await loading;
  } else {
   // New instruments also start hidden unless included in the owner's list.
   for (const row of cfg.instruments || []) if (!known.has(row.ticker)) {
    if (entry && !entry.visibleTickers.includes(row.ticker)) hidden.add(row.ticker);
    known.add(row.ticker);
   }
  }
  mount();
 }
 window.addEventListener('pageshow', event => {
  if (!event.persisted || !config || !hidden) return;
  loaded = false; loading = null;
  initialise(config, hidden, redraw).then(redraw).catch(error => status(error.message));
 });
 return {initialise, updateVisibility, pageKey:key};
})();
