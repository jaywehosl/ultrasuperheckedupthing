import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsController } from '@/layouts/settings-controller-context';
import { useXrayController } from '@/layouts/xray-controller-context';
import { useStatusQuery } from '@/api/queries/useStatusQuery';

export type Severity = 'danger' | 'warning' | 'info';

export interface NotificationRow {
  id: string;
  severity: Severity;
  text: ReactNode;
}

/**
 * Single source of truth for the status-bar notification strip AND the header
 * bell badge. Aggregates the live alerts that used to live as in-page "tablets"
 * on the Settings / Xray pages, now that their state is global:
 *   • Xray-core health (crashed / stopped) — from the polled server status.
 *   • Security warnings ("panel may be exposed") — mirrors SettingsPage's
 *     confAlerts, computed from the global settings draft.
 *   • Restart reminders — panel- and core-restart pending after a save.
 */
export function useNotifications(): NotificationRow[] {
  const { t } = useTranslation();
  const { allSetting, fetched: settingsFetched, restartNeeded } = useSettingsController();
  const { xrayRestartNeeded } = useXrayController();
  const { status, fetched: statusFetched } = useStatusQuery();

  return useMemo(() => {
    const rows: NotificationRow[] = [];

    // 1) Xray-core health (only once status has actually loaded — the default
    //    Status() reports 'stop' and would otherwise flash a false alert).
    if (statusFetched) {
      if (status.xray.state === 'error') {
        rows.push({
          id: 'xray-error',
          severity: 'danger',
          text: status.xray.errorMsg
            ? t('pages.index.notifyXrayError', { msg: status.xray.errorMsg })
            : t('pages.index.notifyXrayErrorGeneric'),
        });
      } else if (status.xray.state === 'stop') {
        rows.push({ id: 'xray-stop', severity: 'warning', text: t('pages.index.notifyXrayStopped') });
      }
    }

    // 2) Security warnings — same checks as SettingsPage confAlerts.
    if (settingsFetched) {
      const sec: string[] = [];
      if (window.location.protocol !== 'https:') sec.push(t('pages.settings.warnHttp'));
      if (allSetting.webPort === 2053) sec.push(t('pages.settings.warnDefaultPort'));
      const shallowPath = window.location.pathname.split('/').length < 4;
      if (shallowPath && allSetting.webBasePath === '/') sec.push(t('pages.settings.warnDefaultBasePath'));
      if (allSetting.subEnable) {
        let subPath = allSetting.subPath;
        if (allSetting.subURI) { try { subPath = new URL(allSetting.subURI).pathname; } catch { /* noop */ } }
        if (subPath === '/sub/') sec.push(t('pages.settings.warnDefaultSubPath'));
      }
      if (allSetting.subJsonEnable) {
        let jsonPath = allSetting.subJsonPath;
        if (allSetting.subJsonURI) { try { jsonPath = new URL(allSetting.subJsonURI).pathname; } catch { /* noop */ } }
        if (jsonPath === '/json/') sec.push(t('pages.settings.warnDefaultJsonPath'));
      }
      sec.forEach((msg, i) => rows.push({ id: `sec-${i}`, severity: 'danger', text: msg }));
    }

    // 3) Restart reminders.
    if (restartNeeded) {
      rows.push({ id: 'restart-panel', severity: 'warning', text: t('pages.index.notifyRestartPanel') });
    }
    if (xrayRestartNeeded) {
      rows.push({ id: 'restart-xray', severity: 'warning', text: t('pages.index.notifyRestartXray') });
    }

    return rows;
  }, [t, allSetting, settingsFetched, statusFetched, status, restartNeeded, xrayRestartNeeded]);
}
