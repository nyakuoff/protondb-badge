import { definePlugin, Field, Toggle } from '@steambrew/client';
import { UIMode } from './injection/detector';
import { setupObserver, disconnectObserver } from './injection/observer';

export default definePlugin(() => {
  console.log('[ProtonDB] plugin loaded | window.MainWindowBrowserManager?',
    !!(window as any).MainWindowBrowserManager);

  // The plugin runs INSIDE the SP Desktop document (confirmed by data-millennium-plugin attr).
  // Just observe document directly — no need to wait for AddWindowCreateHook.
  setupObserver(document, UIMode.Desktop);

  return {
    title: 'ProtonDB Status',
    icon: null,
    onDismount() {
      disconnectObserver();
    },
    content: (
      <Field label="Show ProtonDB Status">
        <Toggle
          value={localStorage.getItem('protondb-status.show') !== 'false'}
          onChange={(value: boolean) => {
            localStorage.setItem('protondb-status.show', String(value));
          }}
        />
      </Field>
    ),
  };
});


