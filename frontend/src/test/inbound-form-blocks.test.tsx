import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';

import {
  ExternalProxyForm,
  GrpcForm,
  HttpUpgradeForm,
  KcpForm,
  RawForm,
  SockoptForm,
  WsForm,
  XhttpForm,
} from '@/pages/inbounds/form/transport';
import { RealityForm, TlsForm } from '@/pages/inbounds/form/security';
import { useFormState } from '@/lib/form/useFormState';
import { FormProvider } from '@/lib/form/FormContext';
import { renderWithProviders, dsFieldLabels } from './test-utils';

function FormHarness({
  children,
  initialValues,
}: {
  children: ReactNode;
  initialValues?: Record<string, unknown>;
}) {
  const ctl = useFormState<Record<string, unknown>>(() => initialValues ?? {});
  return <FormProvider ctl={ctl}>{children}</FormProvider>;
}

function renderInForm(node: ReactNode, initialValues?: Record<string, unknown>) {
  return renderWithProviders(<FormHarness initialValues={initialValues}>{node}</FormHarness>);
}

const noop = () => {};

describe('inbound transport forms', () => {
  it('RawForm field structure is stable', () => {
    renderInForm(<RawForm />);
    expect(dsFieldLabels()).toMatchSnapshot();
  });

  it('WsForm field structure is stable', () => {
    renderInForm(<WsForm />);
    expect(dsFieldLabels()).toMatchSnapshot();
  });

  it('GrpcForm field structure is stable', () => {
    renderInForm(<GrpcForm />);
    expect(dsFieldLabels()).toMatchSnapshot();
  });

  it('KcpForm field structure is stable', () => {
    renderInForm(<KcpForm />);
    expect(dsFieldLabels()).toMatchSnapshot();
  });

  it('HttpUpgradeForm field structure is stable', () => {
    renderInForm(<HttpUpgradeForm />);
    expect(dsFieldLabels()).toMatchSnapshot();
  });

  it('XhttpForm field structure is stable', () => {
    renderInForm(<XhttpForm />);
    expect(dsFieldLabels()).toMatchSnapshot();
  });

  it('ExternalProxyForm field structure is stable (one TLS entry)', () => {
    renderInForm(
      <ExternalProxyForm toggleExternalProxy={noop} />,
      {
        streamSettings: {
          externalProxy: [{
            forceTls: 'tls',
            dest: '',
            port: 443,
            remark: '',
            sni: '',
            fingerprint: '',
            alpn: [],
          }],
        },
      },
    );
    expect(dsFieldLabels()).toMatchSnapshot();
  });

  it('SockoptForm field structure is stable (enabled + happy eyeballs)', () => {
    renderInForm(
      <SockoptForm toggleSockopt={noop} />,
      { streamSettings: { sockopt: { happyEyeballs: {} } } },
    );
    expect(dsFieldLabels()).toMatchSnapshot();
  });
});

describe('inbound security forms', () => {
  it('TlsForm field structure is stable', () => {
    renderInForm(
      <TlsForm
        saving={false}
        setCertFromPanel={noop}
        clearCertFiles={noop}
        generateRandomPinHash={noop}
        getNewEchCert={noop}
        clearEchCert={noop}
      />,
    );
    expect(dsFieldLabels()).toMatchSnapshot();
  });

  it('RealityForm field structure is stable', () => {
    renderInForm(
      <RealityForm
        saving={false}
        randomizeRealityTarget={noop}
        randomizeShortIds={noop}
        genRealityKeypair={noop}
        clearRealityKeypair={noop}
        genMldsa65={noop}
        clearMldsa65={noop}
      />,
    );
    expect(dsFieldLabels()).toMatchSnapshot();
  });
});
