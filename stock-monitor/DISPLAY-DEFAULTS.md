# Page display defaults

Each monitor page has a separate allowlist in `data/stock-monitor-display-defaults.json`. All lists initially contain no tickers, so every category starts hidden.

Open Settings and select the tickers to display. Visitor selections apply only within the current document and survive its automatic data refreshes. A new page load, reload or return from browser history starts with the owner's saved defaults. Old `stockMonitorHiddenTickers` browser preferences are ignored.

To change the shared default list, expand **Owner defaults for this page**, connect a GitHub token restricted to `myai118/digital-tools` with Contents read/write permission, then choose **Save current selection as defaults**. Credentials remain in memory and are cleared on disconnect or reload. Saving fetches the latest configuration, preserves other pages and rejects a concurrent change to the same page. A save triggers normal GitHub Pages publication; new visits see the new defaults after deployment.

Independent pages:

- `stock-monitor/index.html`
- `stock-monitor/index-syc.html`
- `stock-monitor/kwc.html`
- `stock-monitor/tools/index-syc.html`
- `stock-monitor/tools/kwc.html`
- `stock-monitor/tools/syc.html`
- `stock-monitor/tools/klz.html`
- `stock-monitor/index-funds.html` (fund selection only)

`stock-monitor/index-kwc.html` redirects to `stock-monitor/kwc.html`, and `stock-monitor/tools/index-kwc.html` redirects to `stock-monitor/tools/kwc.html`; each uses its destination's defaults.

Display settings do not change shared ticker data, retrieval jobs or prices. Hiding tickers does not make the public data private. If defaults cannot load or are missing for a page, rendering waits with an error instead of showing all tickers.

Run tests with `node --test tests/test_display_defaults.cjs tests/test_monitor_display_integration.cjs`. The integration test executes the production scripts with a minimal DOM, not a full browser. The downloadable single-file preview uses mock GitHub requests and local preview storage; no real token or live save is involved.
