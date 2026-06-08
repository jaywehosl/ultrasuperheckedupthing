import { createRoot } from 'react-dom/client';
import 'antd/dist/reset.css';

import { readyI18n } from '@/i18n/react';
import { ThemeProvider } from '@/hooks/useTheme';
import { QueryProvider } from '@/api/QueryProvider';
import { ToastViewport } from '@/components/ds';
import SubPage from '@/pages/sub/SubPage';

readyI18n().then(() => {
  const root = document.getElementById('app');
  if (root) {
    createRoot(root).render(
      <ThemeProvider>
        <QueryProvider>
          <SubPage />
          <ToastViewport />
        </QueryProvider>
      </ThemeProvider>,
    );
  }
});
