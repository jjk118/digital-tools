'use strict';
// Each page's displayed tickers are controlled by the repository owner.
window.StockMonitorDisplay = (() => {
 const root = new URL('../', document.currentScript.src);
 const configURL = new URL('data/stock-monitor-display-defaults.json', root);
 const relative = location.pathname.slice(root.pathname.length).replace(/^stock-monitor\//, '') || 'index.html';
 const key = relative.endsWith('/') ? relative + 'index.html' : relative;
 let loading = null, entry = null, config, hidden, redraw;
 function validate(data) {
  if (!data || data.version !== 1 || !data.pages || typeof data.pages !== 'object' || Array.isArray(data.pages)) throw Error('Invalid default display settings.');
  if (!Object.hasOwn(data.pages, key)) throw Error('No default ticker list has been configured for this page.');
  const item = data.pages[key];
  if (!item || !Array.isArray(item.visibleTickers) || item.visibleTickers.some(t => typeof t !== 'string')) throw Error('Invalid default ticker list.');
  return item;
 }
 async function initialise(cfg, hiddenSet, rerender) {
  config = cfg; hidden = hiddenSet; redraw = rerender;
  if (!loading) loading = (async () => {
   const url = new URL(configURL); url.searchParams.set('ts', Date.now());
   const response = await fetch(url, {cache:'no-store'});
   if (!response.ok) throw Error('Default display settings unavailable. Please reload this page.');
   entry = validate(await response.json());
  })().catch(error => { loading = null; throw error; });
  await loading;
  const selected = new Set(entry.visibleTickers);
  hiddenSet.clear();
  for (const row of cfg.instruments || []) if (!selected.has(row.ticker)) hiddenSet.add(row.ticker);
 }
 window.addEventListener('pageshow', event => {
  if (!event.persisted || !config || !hidden) return;
  loading = null;
  initialise(config, hidden, redraw).then(redraw).catch(error => {
   const status = document.getElementById('status');
   if (status) status.textContent = error.message;
  });
 });
 return {initialise, pageKey:key};
})();
