import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { HttpUtil, RandomUtil } from '@/utils';
import { getMessage } from '@/utils/messageBus';
import { getRandomRealityTarget } from '@/models/reality-targets';
import { TlsStreamSettingsSchema } from '@/schemas/protocols/security/tls';
import { RealityStreamSettingsSchema } from '@/schemas/protocols/security/reality';
import type { FormController } from '@/lib/form/useFormState';
import type { InboundFormValues } from '@/schemas/forms/inbound-form';

interface UseSecurityActionsArgs {
  ctl: FormController<InboundFormValues>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  // Node the inbound is deployed to (null = central panel). "Set Cert from
  // Panel" must read the node's own cert paths for a node-assigned inbound —
  // the central panel's paths don't exist on the node. See issue #4854.
  nodeId: number | null;
}

// Server-side TLS / Reality key + certificate generation handlers for the
// inbound modal's security tab. Each talks to a /panel server endpoint and
// writes the result back into the form controller.
export function useSecurityActions({ ctl, setSaving, nodeId }: UseSecurityActionsArgs) {
  const { t } = useTranslation();

  const genRealityKeypair = async () => {
    setSaving(true);
    try {
      const msg = await HttpUtil.get('/panel/api/server/getNewX25519Cert');
      if (msg?.success) {
        const obj = msg.obj as { privateKey: string; publicKey: string };
        ctl.set(['streamSettings', 'realitySettings', 'privateKey'], obj.privateKey);
        ctl.set(['streamSettings', 'realitySettings', 'settings', 'publicKey'], obj.publicKey);
      }
    } finally {
      setSaving(false);
    }
  };

  const clearRealityKeypair = () => {
    ctl.set(['streamSettings', 'realitySettings', 'privateKey'], '');
    ctl.set(['streamSettings', 'realitySettings', 'settings', 'publicKey'], '');
  };

  const genMldsa65 = async () => {
    setSaving(true);
    try {
      const msg = await HttpUtil.get('/panel/api/server/getNewmldsa65');
      if (msg?.success) {
        const obj = msg.obj as { seed: string; verify: string };
        ctl.set(['streamSettings', 'realitySettings', 'mldsa65Seed'], obj.seed);
        ctl.set(['streamSettings', 'realitySettings', 'settings', 'mldsa65Verify'], obj.verify);
      }
    } finally {
      setSaving(false);
    }
  };

  const clearMldsa65 = () => {
    ctl.set(['streamSettings', 'realitySettings', 'mldsa65Seed'], '');
    ctl.set(['streamSettings', 'realitySettings', 'settings', 'mldsa65Verify'], '');
  };

  const randomizeRealityTarget = () => {
    const tgt = getRandomRealityTarget() as { target: string; sni: string };
    ctl.set(['streamSettings', 'realitySettings', 'target'], tgt.target);
    ctl.set(
      ['streamSettings', 'realitySettings', 'serverNames'],
      tgt.sni.split(',').map((s) => s.trim()).filter(Boolean),
    );
  };

  const randomizeShortIds = () => {
    ctl.set(
      ['streamSettings', 'realitySettings', 'shortIds'],
      RandomUtil.randomShortIds().split(',').map((s) => s.trim()).filter(Boolean),
    );
  };

  const getNewEchCert = async () => {
    const sni = ctl.get(['streamSettings', 'tlsSettings', 'serverName']);
    setSaving(true);
    try {
      const msg = await HttpUtil.post('/panel/api/server/getNewEchCert', { sni });
      if (msg?.success) {
        const obj = msg.obj as { echServerKeys: string; echConfigList: string };
        ctl.set(['streamSettings', 'tlsSettings', 'echServerKeys'], obj.echServerKeys);
        ctl.set(['streamSettings', 'tlsSettings', 'settings', 'echConfigList'], obj.echConfigList);
      }
    } finally {
      setSaving(false);
    }
  };

  const clearEchCert = () => {
    ctl.set(['streamSettings', 'tlsSettings', 'echServerKeys'], '');
    ctl.set(['streamSettings', 'tlsSettings', 'settings', 'echConfigList'], '');
  };

  const generateRandomPinHash = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const hash = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const current = ctl.get<string[]>(['streamSettings', 'tlsSettings', 'settings', 'pinnedPeerCertSha256']) ?? [];
    ctl.set(['streamSettings', 'tlsSettings', 'settings', 'pinnedPeerCertSha256'], [...current, hash]);
  };

  const setCertFromPanel = async (certName: number) => {
    setSaving(true);
    try {
      // Node-assigned inbounds run on the node, so their cert files must be the
      // node's own paths (fetched through the central panel), not this panel's.
      const msg = typeof nodeId === 'number'
        ? await HttpUtil.get(`/panel/api/nodes/webCert/${nodeId}`, undefined, { silent: true })
        : await HttpUtil.post('/panel/setting/all', undefined, { silent: true });
      if (!msg?.success) {
        getMessage().warning(msg?.msg || t('pages.inbounds.setDefaultCertEmpty'));
        return;
      }
      const obj = msg.obj as { webCertFile?: string; webKeyFile?: string };
      if (!obj?.webCertFile && !obj?.webKeyFile) {
        getMessage().warning(t('pages.inbounds.setDefaultCertEmpty'));
        return;
      }
      ctl.set(['streamSettings', 'tlsSettings', 'certificates', certName, 'certificateFile'], obj.webCertFile ?? '');
      ctl.set(['streamSettings', 'tlsSettings', 'certificates', certName, 'keyFile'], obj.webKeyFile ?? '');
    } finally {
      setSaving(false);
    }
  };

  const clearCertFiles = (certName: number) => {
    ctl.set(['streamSettings', 'tlsSettings', 'certificates', certName, 'certificateFile'], '');
    ctl.set(['streamSettings', 'tlsSettings', 'certificates', certName, 'keyFile'], '');
  };

  const onSecurityChange = async (next: string) => {
    const current = (ctl.get<Record<string, unknown>>(['streamSettings'])) ?? {};
    const cleaned: Record<string, unknown> = { ...current, security: next };
    delete cleaned.tlsSettings;
    delete cleaned.realitySettings;
    if (next === 'tls') {
      const tls = TlsStreamSettingsSchema.parse({}) as Record<string, unknown>;
      tls.certificates = [{
        useFile: true,
        certificateFile: '',
        keyFile: '',
        certificate: [],
        key: [],
        ocspStapling: 3600,
        oneTimeLoading: false,
        usage: 'encipherment',
        buildChain: false,
      }];
      cleaned.tlsSettings = tls;
    }
    if (next === 'reality') {
      const reality = RealityStreamSettingsSchema.parse({}) as Record<string, unknown>;
      const tgt = getRandomRealityTarget() as { target: string; sni: string };
      reality.target = tgt.target;
      reality.serverNames = tgt.sni.split(',').map((s) => s.trim()).filter(Boolean);
      reality.shortIds = RandomUtil.randomShortIds().split(',').map((s) => s.trim()).filter(Boolean);
      cleaned.realitySettings = reality;
    }
    ctl.set(['streamSettings'], cleaned);
    if (next === 'reality') {
      try {
        const msg = await HttpUtil.get('/panel/api/server/getNewX25519Cert');
        if (msg?.success) {
          const obj = msg.obj as { privateKey: string; publicKey: string };
          ctl.set(['streamSettings', 'realitySettings', 'privateKey'], obj.privateKey);
          ctl.set(['streamSettings', 'realitySettings', 'settings', 'publicKey'], obj.publicKey);
        }
      } catch {
        // best-effort: leave keypair fields empty if server call fails
      }
    }
  };

  return {
    genRealityKeypair,
    clearRealityKeypair,
    genMldsa65,
    clearMldsa65,
    randomizeRealityTarget,
    randomizeShortIds,
    getNewEchCert,
    clearEchCert,
    generateRandomPinHash,
    setCertFromPanel,
    clearCertFiles,
    onSecurityChange,
  };
}
