import type { ReactNode } from 'react';

/* Builds a settings category tab label: icon + text on desktop, and on
   mobile just the icon (with the text as a native title hint) — mirroring the
   old top tab bar's icons-only behaviour. */
export function catTabLabel(icon: ReactNode, text: ReactNode, iconsOnly: boolean): ReactNode {
  if (iconsOnly) {
    return (
      <span title={typeof text === 'string' ? text : undefined} style={{ display: 'inline-flex' }}>
        {icon}
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {icon}
      <span>{text}</span>
    </span>
  );
}
