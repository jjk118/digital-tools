# Page-specific maintenance instructions

## KWC admin links — explicit owner requirement (2026-10-21)

- Only `myweb/kwc.html` has the bottom admin hyperlinks: “Admin Stock Monitor Refresh” and “Admin What's On”.
- Preserve these links when updating, redesigning, syncing or regenerating KWC.
- Do not copy or replicate these links into `myweb/syc.html`, `myweb/klz.html`, any `index.html`, or any other page. Do not overwrite KWC with another portal page and lose these links.
- Stock monitor admin target: `../market-watch-admin.html#adminRefreshPrices`. This opens the existing admin refresh controls; clicking the hyperlink itself does not run a refresh.
- What's On admin target: `https://myai118.github.io/EverydayCompass/singapore-whats-on.html#admin-whats-on`. This opens its existing settings panel after source configuration loads.
- The public What's On page in `myai118/EverydayCompass` must have no bottom-left settings dot or visible settings hyperlink. Keep its settings panel accessible through the KWC link.
- Do not remove or broaden this exception unless the owner explicitly requests it. Existing admin authentication remains in place.
