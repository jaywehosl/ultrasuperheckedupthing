import { useEffect, useRef, useState } from 'react';

import { FinalMaskForm } from '@/lib/xray/forms/transport';
import { FormProvider } from '@/lib/form/FormContext';
import { useFormState } from '@/lib/form/useFormState';
import type { FinalMaskStreamSettings } from '@/schemas/protocols/stream/finalmask';

interface SubJsonFinalMaskFormProps {
  value: string;
  onChange: (next: string) => void;
}

function hasValue(v: unknown): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.some(hasValue);
  if (typeof v === 'object') return Object.values(v as Record<string, unknown>).some(hasValue);
  if (typeof v === 'string') return v.length > 0;
  return true;
}

function parseFinalMask(raw: string): FinalMaskStreamSettings {
  try {
    if (raw) return JSON.parse(raw) as FinalMaskStreamSettings;
  } catch {
    return { tcp: [], udp: [] };
  }
  return { tcp: [], udp: [] };
}

export default function SubJsonFinalMaskForm({ value, onChange }: SubJsonFinalMaskFormProps) {
  const [initial] = useState(() => parseFinalMask(value));
  const ctl = useFormState<{ finalmask: FinalMaskStreamSettings }>(() => ({ finalmask: initial }));
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const finalmask = ctl.get<FinalMaskStreamSettings>(['finalmask']);

  useEffect(() => {
    if (finalmask === undefined) return;
    const next = hasValue(finalmask) ? JSON.stringify(finalmask) : '';
    if (next !== value) onChangeRef.current(next);
  }, [finalmask, value]);

  return (
    <FormProvider ctl={ctl}>
      <FinalMaskForm name="finalmask" network="" protocol="" showAll />
    </FormProvider>
  );
}
