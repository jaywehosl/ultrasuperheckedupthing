import { describe, it, expect } from 'vitest';

import InboundFormModal from '@/pages/inbounds/form/InboundFormModal';
import { renderWithProviders, dsFieldLabels } from './test-utils';

function renderModal() {
  return renderWithProviders(
    <InboundFormModal
      open
      mode="add"
      dbInbound={null}
      dbInbounds={[]}
      availableNodes={[]}
      onClose={() => {}}
      onSaved={() => {}}
    />,
  );
}

describe('InboundFormModal', () => {
  it('renders add mode without crashing', () => {
    renderModal();
    // Radix dialog content is portalled to body.
    expect(document.querySelector('.ds-dialog__content')).toBeTruthy();
    expect(dsFieldLabels().length).toBeGreaterThan(0);
  });
});
