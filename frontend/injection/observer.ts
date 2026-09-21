import {
  UIMode,
  detectGamePage,
  setRoutePatchData,
  clearRoutePatchData
} from './detector';
import { fetchProtonDbRating, isNonSteamGame } from '../services/protondbApi';
import { findToolbarRow, createBadge } from '../display/badge';

const BADGE_ID = 'protondb-status-badge';

interface WindowState {
  doc: Document;
  mode: UIMode;
  observer: MutationObserver;
  intervalId: ReturnType<typeof setInterval>;
  debounceHandle: ReturnType<typeof setTimeout> | null;
  routePatchCleanup: (() => void) | null;
  currentAppId: number | null;
  processingAppId: number | null;
  panelDoc: Document | null;
  lastLoggedAppId: number | null | undefined;
}

// Keyed by Steam's window name (e.g. "SP Desktop_uid0") rather than Document
// identity — Steam can hand out a new Document for the same logical window
// (e.g. desktop, when returning from Big Picture), and keying by name lets
// us detect and cleanly replace a stale observer instead of accumulating
// duplicates that fight over the same DOM.
const windowStates = new Map<string, WindowState>();

function setupRoutePatch(state: WindowState): void {
  const routerHook = (window as any).__ROUTER_HOOK_INSTANCE;
  if (!routerHook) {
    console.log('[ProtonDB] Router hook not available for this window');
    return;
  }

  const patchFn = (props: any) => {
    const renderFunc = props.children?.props?.renderFunc;
    if (renderFunc) {
      const orig = renderFunc;
      props.children.props.renderFunc = (...args: any[]) => {
        const ret = orig(...args);
        const overview = ret?.props?.children?.props?.overview;
        if (overview?.appid) {
          setRoutePatchData(
            overview.appid,
            UIMode.BigPicture,
            overview.display_name
          );
        }
        return ret;
      };
    }
    return props;
  };

  const EUIMODE_GAMEPAD = 4;
  routerHook.addPatch('/library/app/:appid', patchFn, EUIMODE_GAMEPAD);
  state.routePatchCleanup = () =>
    routerHook.removePatch('/library/app/:appid', patchFn, EUIMODE_GAMEPAD);
}

async function handleGamePage(state: WindowState): Promise<void> {
  try {
    await _handleGamePage(state);
  } catch (e) {
    console.error('[ProtonDB] handleGamePage threw:', e);
  }
}

function scheduleHandleGamePage(state: WindowState): void {
  if (state.debounceHandle) clearTimeout(state.debounceHandle);
  state.debounceHandle = setTimeout(() => {
    state.debounceHandle = null;
    handleGamePage(state);
  }, 100);
}

async function _handleGamePage(state: WindowState): Promise<void> {
  const { doc, mode } = state;
  const info = detectGamePage(doc, mode);
  const detectedAppId = info?.appId ?? null;

  if (detectedAppId !== state.lastLoggedAppId) {
    state.lastLoggedAppId = detectedAppId;
    console.log(
      '[ProtonDB]',
      mode,
      'detection changed → appId:',
      detectedAppId
    );
  }

  if (!info) {
    if (state.currentAppId !== null) {
      state.panelDoc?.getElementById(BADGE_ID)?.remove();
      state.panelDoc = null;
      state.currentAppId = null;
      state.processingAppId = null;
    }
    if (mode === UIMode.BigPicture) {
      clearRoutePatchData();
    }
    return;
  }

  const { appId, title } = info;

  if (state.currentAppId !== appId) {
    state.panelDoc?.getElementById(BADGE_ID)?.remove();
    state.currentAppId = appId;
    state.processingAppId = null;
  }

  const existingBadge = state.panelDoc?.getElementById(BADGE_ID);
  if (existingBadge) {
    if (existingBadge.textContent?.includes('Pending')) {
      existingBadge.remove();
      return;
    }
    if (
      existingBadge.parentElement &&
      existingBadge !== existingBadge.parentElement.lastElementChild
    ) {
      existingBadge.parentElement.appendChild(existingBadge);
    }
    return;
  }

  if (state.processingAppId === appId) return;
  state.processingAppId = appId;

  const target = findToolbarRow(state.doc);
  if (!target) {
    state.processingAppId = null;
    return;
  }
  state.panelDoc = target.doc;

  const rating = await fetchProtonDbRating(
    appId,
    isNonSteamGame(appId) ? title : undefined
  );

  if (state.currentAppId !== appId) {
    state.processingAppId = null;
    return;
  }
  if (!rating) {
    state.processingAppId = null;
    return;
  }

  const ACHIEVEMENTS_WAIT_MS = 400;
  const deadline = Date.now() + ACHIEVEMENTS_WAIT_MS;
  while (Date.now() < deadline) {
    const rowNow =
      target.doc.getElementById(target.row.id as string) ?? target.row;
    const hasAchievements = Array.from(rowNow.children).some(el =>
      el.textContent?.includes('Achievements')
    );
    if (hasAchievements) break;
    await new Promise(r => setTimeout(r, 50));
  }

  if (state.currentAppId !== appId) {
    state.processingAppId = null;
    return;
  }

  const freshTarget = findToolbarRow(state.doc) ?? target;
  if (freshTarget.doc.getElementById(BADGE_ID)) {
    state.processingAppId = null;
    return;
  }
  state.panelDoc = freshTarget.doc;
  freshTarget.row.appendChild(createBadge(rating, freshTarget.doc));
  state.processingAppId = null;
}

function teardownState(state: WindowState): void {
  state.observer?.disconnect();
  if (state.intervalId) clearInterval(state.intervalId);
  if (state.debounceHandle) clearTimeout(state.debounceHandle);
  state.routePatchCleanup?.();
  state.panelDoc?.getElementById(BADGE_ID)?.remove();
}

// Sets up (or re-attaches) an observer for the given named window.
// - Same name + same doc: already watching this exact window, no-op.
// - Same name + different doc: Steam handed us a new Document for a window
//   we already know about (e.g. desktop after returning from Big Picture) —
//   tear down the stale observer and attach a fresh one to the new doc.
// - New name: brand new window, set up from scratch.
export function setupObserver(name: string, doc: Document, mode: UIMode): void {
  const existing = windowStates.get(name);

  if (existing && existing.doc === doc) {
    console.log('[ProtonDB] Observer already running for', name, '— skipping');
    return;
  }

  if (existing) {
    console.log(
      '[ProtonDB] Document changed for',
      name,
      '— tearing down stale observer and reattaching'
    );
    teardownState(existing);
  }

  const state: WindowState = {
    doc,
    mode,
    observer: null as any,
    intervalId: null as any,
    debounceHandle: null,
    routePatchCleanup: null,
    currentAppId: null,
    processingAppId: null,
    panelDoc: null,
    lastLoggedAppId: undefined
  };

  if (mode === UIMode.BigPicture) {
    setupRoutePatch(state);
  }

  state.observer = new MutationObserver(() => scheduleHandleGamePage(state));
  state.observer.observe(doc.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
  state.intervalId = setInterval(() => scheduleHandleGamePage(state), 500);

  windowStates.set(name, state);
  handleGamePage(state);
  console.log(
    '[ProtonDB] Observer set up for',
    name,
    '(' + mode + ')',
    '| total tracked windows:',
    windowStates.size,
    '| names:',
    [...windowStates.keys()]
  );
}

export function disconnectObserverForName(name: string): void {
  const state = windowStates.get(name);
  if (!state) return;
  teardownState(state);
  windowStates.delete(name);
}

export function disconnectAllObservers(): void {
  for (const name of windowStates.keys()) {
    disconnectObserverForName(name);
  }
}
