import { createContext, useContext } from 'react';
import type { UseXraySettingResult } from '@/hooks/useXraySetting';

export interface XrayControllerValue extends UseXraySettingResult {
  /** a save succeeded → an Xray-core restart is appropriate to apply it */
  xrayRestartNeeded: boolean;
  /** validate the advanced JSON, then save the template */
  onSaveAll: () => Promise<void>;
  /** restart the Xray core immediately (no confirm) */
  onRestartXray: () => Promise<void>;
}

// Component-free module so the context identity is stable across HMR (same
// reasoning as settings-controller-context).
export const XrayControllerContext = createContext<XrayControllerValue | null>(null);

export function useXrayController(): XrayControllerValue {
  const ctx = useContext(XrayControllerContext);
  if (!ctx) throw new Error('useXrayController must be used within an XrayControllerProvider');
  return ctx;
}
