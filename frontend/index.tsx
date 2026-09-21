import { definePlugin, Millennium, Field, Toggle } from '@steambrew/client';
import { UIMode } from './injection/detector';
import { setupObserver, disconnectAllObservers } from './injection/observer';

export default definePlugin(() => {
  console.log('[ProtonDB] plugin loading...');

  Millennium.AddWindowCreateHook?.((context: any) => {
    if (!context.m_strName?.startsWith('SP ')) return;
    const doc = context.m_popup?.document;
    if (!doc?.body) return;

    const mode: UIMode = context.m_strName.includes('BPM')
      ? UIMode.BigPicture
      : UIMode.Desktop;
    setupObserver(context.m_strName, doc, mode);
  });

  return {
    title: 'ProtonDB Status',
    icon: null,
    onDismount() {
      disconnectAllObservers();
    },
    content: (
      <Field label='Show ProtonDB Status'>
        <Toggle
          value={localStorage.getItem('protondb-status.show') !== 'false'}
          onChange={(value: boolean) => {
            localStorage.setItem('protondb-status.show', String(value));
          }}
        />
      </Field>
    )
  };
});
