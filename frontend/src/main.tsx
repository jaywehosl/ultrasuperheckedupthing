import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import '@/styles/tokens.css';
import '@/styles/utils.css';
import '@/styles/page-shell.css';
import '@/styles/page-cards.css';

import { setupAxios } from '@/api/axios-init';
import { readyI18n } from '@/i18n/react';
import { ThemeProvider } from '@/hooks/useTheme';
import { QueryProvider } from '@/api/QueryProvider';
import { ToastViewport } from '@/components/ds';
import { router } from '@/routes';

setupAxios();

readyI18n().then(() => {
  const root = document.getElementById('app');
  if (root) {
    createRoot(root).render(
      <ThemeProvider>
        <QueryProvider>
          <RouterProvider router={router} />
          <ToastViewport />
        </QueryProvider>
      </ThemeProvider>,
    );
  }
});
