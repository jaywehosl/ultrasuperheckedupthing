import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { PromiseUtil } from '@/utils';
import { getMessage } from '@/utils/messageBus';
import { useXraySetting } from '@/hooks/useXraySetting';
import { useBusyOverlay } from '@/layouts/busy-overlay-context';
import { useRegisterEditor } from '@/layouts/header-actions-context';
import { XrayControllerContext, type XrayControllerValue } from '@/layouts/xray-controller-context';

/**
 * Lifts the Xray-template draft to the layout level (mirrors SettingsController)
 * so unsaved edits survive navigating away from /panel/xray — the global Save
 * button can then keep showing, and apply those edits, from any page. Owns the
 * core-restart orchestration and registers the 'xray' editor in the header
 * actions registry.
 */
export function XrayControllerProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const busyOverlay = useBusyOverlay();
  const xs = useXraySetting();
  const { xraySetting, saveAll, restartXray, saveDisabled, spinning } = xs;

  // Core-restart reminder: shown after a successful save. In-memory (a panel
  // restart / full reload resets it, which is correct — the core comes back up
  // with it).
  const [xrayRestartNeeded, setXrayRestartNeeded] = useState(false);

  const onSaveAll = useCallback(async () => {
    try {
      JSON.parse(xraySetting);
    } catch (e) {
      getMessage().error(`Advanced JSON: ${(e as Error).message}`);
      navigate('/xray#advanced');
      return;
    }
    await saveAll();
    setXrayRestartNeeded(true);
  }, [xraySetting, navigate, saveAll]);

  // Restart the Xray core immediately (no confirm). The core restarts almost
  // instantly, so hold the global frost for a minimum beat — otherwise it just
  // flashes and looks broken.
  const onRestartXray = useCallback(async () => {
    busyOverlay.show({
      title: t('pages.xray.restartingTitle'),
      subtitle: t('pages.xray.restartingDesc'),
    });
    try {
      await Promise.all([restartXray(), PromiseUtil.sleep(1400)]);
      setXrayRestartNeeded(false);
    } finally {
      busyOverlay.hide();
    }
  }, [busyOverlay, t, restartXray]);

  useRegisterEditor({
    id: 'xray',
    dirty: !saveDisabled,
    restartNeeded: xrayRestartNeeded,
    busy: spinning,
    saveLabel: t('pages.xray.save'),
    restartLabel: t('pages.xray.restart'),
    restartKind: 'xray',
    save: onSaveAll,
    restart: onRestartXray,
  });

  const value = useMemo<XrayControllerValue>(
    () => ({ ...xs, xrayRestartNeeded, onSaveAll, onRestartXray }),
    [xs, xrayRestartNeeded, onSaveAll, onRestartXray],
  );

  return (
    <XrayControllerContext.Provider value={value}>
      {children}
    </XrayControllerContext.Provider>
  );
}
