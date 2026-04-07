export enum UIMode {
  Desktop = 'desktop',
  BigPicture = 'bigpicture',
}

export interface GamePageInfo {
  appId: number;
  mode: UIMode;
}

let patchedAppId: number | null = null;
let patchedMode: UIMode | null = null;

export function setRoutePatchData(appId: number, mode: UIMode): void {
  patchedAppId = appId;
  patchedMode = mode;
}

export function clearRoutePatchData(): void {
  patchedAppId = null;
  patchedMode = null;
}

export function detectGamePage(doc: Document, _mode: UIMode): GamePageInfo | null {
  // Big Picture: patched route data
  if (patchedAppId !== null && patchedMode !== null) {
    return { appId: patchedAppId, mode: patchedMode };
  }

  // Method 1: window.MainWindowBrowserManager (global window — same as HLTB uses)
  const w = window as any;
  const pathname: string | undefined = w.MainWindowBrowserManager?.m_lastLocation?.pathname;
  if (pathname) {
    const m = pathname.match(/\/app\/(\d+)/);
    if (m) {
      console.log('[ProtonDB] detectGamePage: pathname match', pathname);
      return { appId: parseInt(m[1], 10), mode: UIMode.Desktop };
    }
  }

  return null;
}
