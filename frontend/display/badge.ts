import { findClassModule } from '@steambrew/client';
import type { ProtonDbRating } from '../services/protondbApi';

// Live CSS module resolved at runtime; KNOWN is a hardcoded fallback from April 2026 DOM snapshot
const PlayBar = (findClassModule?.(
  (m: any) => !!(m.GameStat && m.PlayBarLabel)
) as Record<string, string> | undefined) ?? null;

const KNOWN: Record<string, string> = {
  GameStat:            '_1kiZKVbDe-9Ikootk57kpA',
  GameStatWithIcon:    '_1aKegVl9_lSdNAyWYZQlr9',
  GameStatIcon:        '_1tIg-QIrwMNtCm7NcYADyi',
  GameStatIconVariant: '_1GZdosVXnfrf69yU8DWASl',
  GameStatRight:       '_3m_zjRTQBqcfzCjXLXUHcR',
  PlayBarLabel:        '_34lrt5-Fc3usZU6trA1P0-',
  PlayBarDetailLabel:  '_2TYVGoD27ZMfjRirKQNLfk',
};

function c(key: string): string {
  return PlayBar?.[key] ?? KNOWN[key] ?? '';
}

const TIER_COLORS: Record<string, string> = {
  platinum: '#00b4d8',
  gold:     '#FFD700',
  silver:   '#C0C0C0',
  bronze:   '#CD7F32',
  borked:   '#e74c3c',
};

function tierLabel(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function tierColor(tier: string): string {
  return TIER_COLORS[tier.toLowerCase()] ?? '#606060';
}

/**
 * Returns the toolbar row AND its owning document (may be an iframe contentDocument).
 * Steam renders the game detail panel inside an iframe, so we must search there.
 */
export interface ToolbarTarget {
  row: HTMLElement;
  doc: Document;
}

let lastOpenMs = 0;

function openProtonDbPage(appId: number): void {
  const url = 'https://www.protondb.com/app/' + appId;
  const w = window as any;

  const now = Date.now();
  if (now - lastOpenMs < 800) return;
  lastOpenMs = now;

  const openInSystemBrowser = w.SteamClient?.System?.OpenInSystemBrowser;
  if (typeof openInSystemBrowser === 'function') {
    try {
      openInSystemBrowser(url);
      return;
    } catch {
    }
  }

  // Fallback: programmatic external tab open without navigating current Steam webview.
  try {
    const a = w.document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    w.document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    console.warn('[ProtonDB] Could not open ProtonDB URL');
  }
}

function _findInDoc(doc: Document): HTMLElement | null {
  // Use runtime class module — most reliable
  if (PlayBar?.GameStatsSection) {
    const els = doc.querySelectorAll('.' + PlayBar.GameStatsSection);
    if (els.length > 0) {
      const el = els[els.length - 1] as HTMLElement;
      return el;
    }
  }

  // Fallback: walk up from the PlaytimeIcon element
  if (PlayBar?.PlaytimeIcon) {
    const icons = doc.querySelectorAll('.' + PlayBar.PlaytimeIcon);
    if (icons.length > 0) {
      const icon = icons[icons.length - 1];
      const row = PlayBar.GameStatsSection
        ? icon.closest('.' + PlayBar.GameStatsSection) as HTMLElement | null
        : icon.parentElement?.parentElement?.parentElement as HTMLElement | null;
      if (row) return row;
    }
  }

  // Last resort: literal .SVGIcon_PlayTime (Steam stable class)
  const svgs = doc.querySelectorAll('[class*="SVGIcon_PlayTime"], .SVGIcon_PlayTime');
  if (svgs.length > 0) {
    const row = svgs[svgs.length - 1].parentElement?.parentElement?.parentElement;
    if (row) return row as HTMLElement;
  }

  return null;
}

/**
 * Searches the main document AND all g_PopupManager windows for the game stats toolbar row.
 */
export function findToolbarRow(): ToolbarTarget | null {
  const inMain = _findInDoc(document);
  if (inMain) {
    console.log('[ProtonDB] findToolbarRow: found in main document');
    return { row: inMain, doc: document };
  }

  // Steam renders the game library detail panel in a separate popup window
  const g_PM = (window as any).g_PopupManager;
  const popups: any[] = g_PM?.GetPopups?.() ?? [];
  let checked = 0;
  for (const popup of popups) {
    let popDoc: Document | null = null;
    try { popDoc = popup?.window?.document; } catch { continue; }
    if (!popDoc || popDoc === document) continue;
    checked++;
    const found = _findInDoc(popDoc);
    if (found) {
      console.log('[ProtonDB] findToolbarRow: found in popup', popup?.m_strName ?? popup?.m_strTitle ?? '?');
      return { row: found, doc: popDoc };
    }
  }

  console.log('[ProtonDB] findToolbarRow: NOT FOUND | PlayBar.GameStatsSection:', PlayBar?.GameStatsSection,
    '| popups checked:', checked, '| total popups:', popups.length);
  return null;
}

export function createBadge(rating: ProtonDbRating, appId: number, doc: Document): HTMLElement {
  const tier = rating.tier;
  const color = tierColor(tier);
  const label = tierLabel(tier);

  const tile = doc.createElement('div');
  tile.id = 'protondb-status-badge';
  tile.className = [c('GameStat'), c('GameStatWithIcon')].filter(Boolean).join(' ');
  // Propagate tier colour via currentColor so SVG icon inherits it
  tile.style.color = color;
  tile.style.cursor = 'pointer';
  tile.style.pointerEvents = 'auto';
  tile.title = 'Open ProtonDB page';
  tile.setAttribute('role', 'button');
  tile.setAttribute('tabindex', '0');
  tile.addEventListener('click', (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    openProtonDbPage(appId);
  });
  tile.addEventListener('mousedown', (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
  });
  tile.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      openProtonDbPage(appId);
    }
  });

  // Icon div
  const iconDiv = doc.createElement('div');
  iconDiv.className = [c('GameStatIcon'), c('GameStatIconVariant')].filter(Boolean).join(' ');

  // ProtonDB icon from homarr-labs/dashboard-icons, recolored to Steam muted gray
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 491 491');
  svg.setAttribute('width', '23');
  svg.setAttribute('height', '23');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const ICON_COLOR = 'currentColor';
  const CENTER_COLOR = 'currentColor';

  const orbits = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  orbits.setAttribute('fill', ICON_COLOR);
  orbits.setAttribute('d', 'M470.5,245.5c0-29.8-37.3-58.1-94.6-75.6c13.2-58.3,7.3-104.7-18.5-119.6c-6-3.5-12.9-5.1-20.5-5.1v20.5c4.2,0,7.6,0.8,10.5,2.4c12.5,7.2,17.9,34.4,13.7,69.4c-1,8.6-2.7,17.7-4.7,27c-18-4.4-37.6-7.8-58.2-10c-12.4-17-25.2-32.4-38.2-45.9c29.9-27.8,58-43,77-43V45.1l0,0c-25.2,0-58.2,18-91.6,49.2c-33.4-31-66.4-48.8-91.6-48.8v20.5c19,0,47.1,15.1,77,42.7c-12.8,13.5-25.7,28.8-37.9,45.8c-20.7,2.2-40.4,5.6-58.3,10.1c-2.1-9.2-3.7-18.1-4.8-26.6c-4.3-35,1-62.3,13.4-69.5c2.8-1.7,6.3-2.4,10.5-2.4V45.6l0,0c-7.7,0-14.7,1.7-20.7,5.1c-25.8,14.9-31.6,61.2-18.3,119.3c-57.1,17.6-94.2,45.8-94.2,75.5c0,29.8,37.3,58.1,94.6,75.6c-13.2,58.3-7.3,104.7,18.5,119.6c6,3.5,12.9,5.1,20.6,5.1c25.2,0,58.2-18,91.6-49.2c33.4,31,66.4,48.8,91.6,48.8c7.7,0,14.7-1.7,20.7-5.1c25.8-14.9,31.6-61.2,18.3-119.3C433.4,303.5,470.5,275.3,470.5,245.5z M351.1,184.4c-3.4,11.8-7.6,24-12.4,36.2c-3.8-7.3-7.7-14.7-12-22c-4.2-7.3-8.7-14.5-13.2-21.5C326.5,179,339.1,181.4,351.1,184.4z M309.1,282.1c-7.2,12.4-14.5,24.1-22.1,35c-13.7,1.2-27.5,1.8-41.5,1.8c-13.9,0-27.7-0.6-41.3-1.7c-7.6-10.9-15-22.6-22.2-34.9c-7-12-13.3-24.2-19.1-36.5c5.7-12.3,12.1-24.6,19-36.6c7.2-12.4,14.5-24.1,22.1-35c13.7-1.2,27.5-1.8,41.5-1.8c13.9,0,27.7,0.6,41.3,1.7c7.6,10.9,15,22.6,22.2,34.9c7,12,13.3,24.2,19.1,36.5C322.3,257.7,315.9,270,309.1,282.1z M338.7,270.1c5,12.3,9.2,24.6,12.7,36.5c-12,2.9-24.7,5.4-37.8,7.3c4.5-7.1,9-14.3,13.2-21.7C331,284.9,334.9,277.5,338.7,270.1z M245.7,368c-8.5-8.8-17.1-18.6-25.5-29.4c8.3,0.4,16.7,0.6,25.2,0.6c8.6,0,17.2-0.2,25.5-0.6C262.7,349.4,254.1,359.2,245.7,368z M177.4,314c-13-1.9-25.6-4.3-37.6-7.2c3.4-11.8,7.6-24,12.4-36.2c3.8,7.3,7.7,14.7,12,22C168.5,299.8,172.9,307,177.4,314z M245.2,123.1c8.5,8.8,17.1,18.6,25.5,29.4c-8.3-0.4-16.7-0.6-25.2-0.6c-8.6,0-17.2,0.2-25.5,0.6C228.3,141.7,236.8,131.9,245.2,123.1z M177.3,177.1c-4.5,7.1-9,14.3-13.2,21.7c-4.2,7.3-8.2,14.7-11.9,22c-5-12.3-9.2-24.6-12.7-36.5C151.6,181.5,164.2,179,177.3,177.1z M94.3,292c-32.5-13.9-53.5-32-53.5-46.4c0-14.4,21-32.7,53.5-46.4c7.9-3.4,16.5-6.4,25.4-9.3c5.2,18,12.1,36.7,20.6,55.9c-8.4,19.1-15.2,37.7-20.4,55.6C110.9,298.5,102.3,295.4,94.3,292z M143.7,423c-12.5-7.2-17.9-34.4-13.7-69.4c1-8.6,2.7-17.7,4.7-27c18,4.4,37.6,7.8,58.2,10c12.4,17,25.2,32.4,38.2,45.9c-29.9,27.8-58,43-77,43C149.9,425.4,146.4,424.6,143.7,423z M361.3,353.1c4.3,35-1,62.3-13.4,69.5c-2.8,1.7-6.3,2.4-10.5,2.4c-19,0-47.1-15.1-77-42.7c12.8-13.5,25.7-28.8,37.9-45.8c20.7-2.2,40.4-5.6,58.3-10.1C358.6,335.7,360.2,344.6,361.3,353.1z M396.6,292c-7.9,3.4-16.5,6.4-25.4,9.3c-5.2-18-12.1-36.7-20.6-55.9c8.4-19.1,15.2-37.7,20.4-55.6c9.1,2.8,17.7,6,25.8,9.4c32.5,13.9,53.5,32,53.5,46.4C450,259.9,429,278.2,396.6,292z');
  svg.appendChild(orbits);

  const center = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
  center.setAttribute('fill', CENTER_COLOR);
  center.setAttribute('cx', '245.4');
  center.setAttribute('cy', '245.5');
  center.setAttribute('r', '41.9');
  svg.appendChild(center);
  iconDiv.appendChild(svg);

  // Text div
  const rightDiv = doc.createElement('div');
  rightDiv.className = c('GameStatRight');

  const labelSpan = doc.createElement('span');
  labelSpan.className = c('PlayBarLabel');
  labelSpan.textContent = 'PROTONDB';

  const valueSpan = doc.createElement('span');
  valueSpan.className = c('PlayBarDetailLabel');
  valueSpan.textContent = label;
  valueSpan.style.color = color;

  rightDiv.appendChild(labelSpan);
  rightDiv.appendChild(valueSpan);

  tile.appendChild(iconDiv);
  tile.appendChild(rightDiv);

  return tile;
}
