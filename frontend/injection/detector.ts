export enum UIMode {
  Desktop = 'desktop',
  BigPicture = 'bigpicture'
}

export interface GamePageInfo {
  appId: number;
  mode: UIMode;
  title: string;
}

let patchedAppId: number | null = null;
let patchedMode: UIMode | null = null;
let patchedTitle: string | null = null;

export function setRoutePatchData(
  appId: number,
  mode: UIMode,
  title?: string
): void {
  patchedAppId = appId;
  patchedMode = mode;
  patchedTitle = title ?? null;
}

export function clearRoutePatchData(): void {
  patchedAppId = null;
  patchedMode = null;
  patchedTitle = null;
}

export function detectGamePage(
  _doc: Document,
  mode: UIMode
): GamePageInfo | null {
  // Only trust patched route data when we're actually being asked about
  // Big Picture — otherwise stale data left over from a previous Big
  // Picture session can hijack desktop detection after switching back.
  if (
    mode === UIMode.BigPicture &&
    patchedAppId !== null &&
    patchedMode !== null
  ) {
    const title = patchedTitle ?? resolveTitle(patchedAppId) ?? '';
    return { appId: patchedAppId, mode: patchedMode, title };
  }

  const w = window as any;
  const pathname: string | undefined =
    w.MainWindowBrowserManager?.m_lastLocation?.pathname;

  if (pathname) {
    const m = pathname.match(/\/app\/(\d+)/);
    if (m) {
      console.log('[ProtonDB] detectGamePage: pathname match', pathname);
      const appId = parseInt(m[1], 10);
      const title = resolveTitle(appId) ?? '';
      return { appId, mode: UIMode.Desktop, title };
    }
  }

  return null;
}

function resolveTitle(appId: number): string | null {
  const w = window as any;
  const overview = w.appStore?.GetAppOverviewByAppID?.(appId);
  return overview?.display_name ?? overview?.name ?? null;
}
