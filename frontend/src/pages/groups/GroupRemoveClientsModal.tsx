import { useTranslation } from 'react-i18next';
import ClientSelectModal from './ClientSelectModal';
import type { ClientRecord } from '@/hooks/useClients';

interface GroupRemoveClientsModalProps {
  open: boolean;
  groupName: string | null;
  members: ClientRecord[];
  onClose: () => void;
  onSubmit: (emails: string[]) => Promise<{ affected?: number } | null>;
}

export default function GroupRemoveClientsModal({
  open,
  groupName,
  members,
  onClose,
  onSubmit,
}: GroupRemoveClientsModalProps) {
  const { t } = useTranslation();
  return (
    <ClientSelectModal
      open={open}
      groupName={groupName}
      clients={members}
      title={t('pages.groups.removeFromGroupTitle', { name: groupName ?? '' })}
      description={t('pages.groups.removeFromGroupDesc')}
      okText={t('remove')}
      okDanger
      successMessage={(count, name) => t('pages.groups.removeFromGroupResult', { count, name })}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
