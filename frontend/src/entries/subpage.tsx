import { createRoot } from 'react-dom/client';
import '@/styles/reset.css';
import '@/styles/tokens.css';
import '@/styles/utils.css';

import { readyI18n } from '@/i18n/react';
import { ThemeProvider } from '@/hooks/useTheme';
import { QueryProvider } from '@/api/QueryProvider';
import { ToastViewport } from '@/components/ds';

// Dev-only preview seed. In production the Go backend injects
// window.__SUB_PAGE_DATA__ before this script runs; under `vite dev` it's absent,
// so open http://localhost:5173/subpage.html to preview the page with this data.
// `import.meta.env.DEV` is statically false in prod builds → the whole block
// (and the sample) is tree-shaken away.
function seedDevSubData() {
  if (!import.meta.env.DEV || window.__SUB_PAGE_DATA__) return;
  const now = Math.floor(Date.now() / 1000);
  window.__SUB_PAGE_DATA__ = {
    sId: 'mpxu31g289p1ut05',
    enabled: true,
    download: '12.4 GB',
    upload: '3.10 GB',
    total: '100 GB',
    used: '15.5 GB',
    remained: '84.5 GB',
    totalByte: 107374182400,
    usedByte: 16642998272,
    downloadByte: 13314398208,
    uploadByte: 3328600064,
    expire: now + 60 * 60 * 24 * 23,
    lastOnline: now - 240,
    subUrl: 'https://62.60.155.31:2096/sub/mpxu31g289p1ut05',
    subJsonUrl: 'https://62.60.155.31:2096/json/mpxu31g289p1ut05',
    subClashUrl: '',
    subTitle: 'Ultra Uber Panel',
    datepicker: 'gregorian',
    emails: ['mpxu31g289p1ut05'],
    links: [
      'vless://11111111-2222-3333-4444-555555555555@62.60.155.31:443?type=tcp&security=reality&pbk=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA&fp=chrome&sni=www.microsoft.com&sid=01234567&flow=xtls-rprx-vision#%F0%9F%87%BA%F0%9F%87%B8%20US-Reality',
      'vless://11111111-2222-3333-4444-555555555555@62.60.155.31:8443?type=ws&security=tls&host=cdn.example.com&path=%2Fwss#%F0%9F%87%A9%F0%9F%87%AA%20EU-WS-TLS',
      'vless://11111111-2222-3333-4444-555555555555@62.60.155.31:2053?type=grpc&security=tls&serviceName=grpcsvc&sni=cdn.example.com#%F0%9F%87%AF%F0%9F%87%B5%20JP-gRPC',
    ],
  };
}

readyI18n().then(async () => {
  seedDevSubData();
  // Imported dynamically so the dev seed above is in place before SubPage reads
  // window.__SUB_PAGE_DATA__ at module-evaluation time.
  const { default: SubPage } = await import('@/pages/sub/SubPage');
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
