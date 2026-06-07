import { useTranslation } from 'react-i18next';
import ClientSelectModal from './ClientSelectModal';
import type { ClientRecord } from '@/hooks/useClients';

interface GroupAddClientsModalProps {
  open: boolean;
  groupName: string | null;
  candidates: ClientRecord[];
  onClose: () => void;
  onSubmit: (emails: string[]) => Promise<{ affected?: number } | null>;
}

export default function GroupAddClientsModal({
  open,
  groupName,
  candidates,
  onClose,
  onSubmit,
}: GroupAddClientsModalProps) {
  const { t } = useTranslation();
  return (
    <ClientSelectModal
      open={open}
      groupName={groupName}
      clients={candidates}
      title={t('pages.groups.addToGroupTitle', { name: groupName ?? '' })}
      description={t('pages.groups.addToGroupDesc')}
      okText={t('add')}
      showCurrentGroup
      emptyText={t('pages.groups.addToGroupEmpty')}
      successMessage={(count, name) => t('pages.groups.addToGroupResult', { count, name })}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
