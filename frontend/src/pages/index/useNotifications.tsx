import { useMemo, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsController } from '@/layouts/settings-controller-context';
import { useXrayController } from '@/layouts/xray-controller-context';
import { useStatusQuery } from '@/api/queries/useStatusQuery';
import {
  subscribe as notifSubscribe,
  getSnapshot as notifSnapshot,
  type AlertCategory,
  type Severity,
} from '@/stores/notificationStore';

export type { Severity };

export interface NotificationRow {
  id: string;
  category: AlertCategory;
  severity: Severity;
  /** Plain-text form, used for the history log when the row is dismissed. */
  text: string;
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

  // The dismissed set + per-category prefs live in the notification store.
  const { dismissed, prefs } = useSyncExternalStore(notifSubscribe, notifSnapshot, notifSnapshot);

  return useMemo(() => {
    const rows: NotificationRow[] = [];

    // 1) Xray-core health (only once status has actually loaded — the default
    //    Status() reports 'stop' and would otherwise flash a false alert).
    if (prefs.xray && statusFetched) {
      if (status.xray.state === 'error') {
        rows.push({
          id: 'xray-error',
          category: 'xray',
          severity: 'danger',
          text: status.xray.errorMsg
            ? t('pages.index.notifyXrayError', { msg: status.xray.errorMsg })
            : t('pages.index.notifyXrayErrorGeneric'),
        });
      } else if (status.xray.state === 'stop') {
        rows.push({ id: 'xray-stop', category: 'xray', severity: 'warning', text: t('pages.index.notifyXrayStopped') });
      }
    }

    // 2) Security warnings — same checks as SettingsPage confAlerts. STABLE ids
    //    (per-check, not positional) so a dismissal sticks to the right alert.
    if (prefs.security && settingsFetched) {
      const sec: { id: string; text: string }[] = [];
      if (window.location.protocol !== 'https:') sec.push({ id: 'sec-http', text: t('pages.settings.warnHttp') });
      if (allSetting.webPort === 2053) sec.push({ id: 'sec-port', text: t('pages.settings.warnDefaultPort') });
      const shallowPath = window.location.pathname.split('/').length < 4;
      if (shallowPath && allSetting.webBasePath === '/') sec.push({ id: 'sec-basepath', text: t('pages.settings.warnDefaultBasePath') });
      if (allSetting.subEnable) {
        let subPath = allSetting.subPath;
        if (allSetting.subURI) { try { subPath = new URL(allSetting.subURI).pathname; } catch { /* noop */ } }
        if (subPath === '/sub/') sec.push({ id: 'sec-subpath', text: t('pages.settings.warnDefaultSubPath') });
      }
      if (allSetting.subJsonEnable) {
        let jsonPath = allSetting.subJsonPath;
        if (allSetting.subJsonURI) { try { jsonPath = new URL(allSetting.subJsonURI).pathname; } catch { /* noop */ } }
        if (jsonPath === '/json/') sec.push({ id: 'sec-jsonpath', text: t('pages.settings.warnDefaultJsonPath') });
      }
      sec.forEach((s) => rows.push({ id: s.id, category: 'security', severity: 'danger', text: s.text }));
    }

    // 3) Restart reminders.
    if (prefs.restart && restartNeeded) {
      rows.push({ id: 'restart-panel', category: 'restart', severity: 'warning', text: t('pages.index.notifyRestartPanel') });
    }
    if (prefs.restart && xrayRestartNeeded) {
      rows.push({ id: 'restart-xray', category: 'restart', severity: 'warning', text: t('pages.index.notifyRestartXray') });
    }

    // Drop anything the user has X-ed away (it lives in history now).
    return rows.filter((r) => !dismissed.includes(r.id));
  }, [t, allSetting, settingsFetched, statusFetched, status, restartNeeded, xrayRestartNeeded, dismissed, prefs]);
}
