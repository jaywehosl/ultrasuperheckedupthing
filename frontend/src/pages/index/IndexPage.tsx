import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useTheme } from '@/hooks/useTheme';
import InboundsPage from '@/pages/inbounds/InboundsPage';
import ClientsPage from '@/pages/clients/ClientsPage';
import GroupsPage from '@/pages/groups/GroupsPage';
import NodesPage from '@/pages/nodes/NodesPage';
import './IndexPage.css';

export default function IndexPage() {
  const { t } = useTranslation();
  const { isDark, isUltra } = useTheme();

  // Smooth-scroll to a section when the URL carries a hash (header nav).
  const { hash } = useLocation();
  useEffect(() => {
    const targetId = hash.replace(/^#/, '').split('#')[0];
    if (!targetId || targetId === 'dashboard') return;
    const timer = setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 300);
    return () => clearTimeout(timer);
  }, [hash]);

  const pageClass = `index-page ${isDark ? 'is-dark' : ''} ${isUltra ? 'is-ultra' : ''}`.trim();

  return (
    <div className={`content-shell index-page-shell ${pageClass}`}>
      <div className="content-area index-page-area">
        <section id="dashboard" className="feed-section dash-hero-section">
          <div className="dash-hero">
            <h1 className="dash-hero-title">
              Experience liftoff with next-gen connection management
            </h1>
            <p className="dash-hero-subtitle">
              A clean, spacious, and high-performance panel powered by Xray-core.
            </p>
          </div>
        </section>

        <section id="inbounds" className="feed-section">
          <div className="section-header">
            <h2>{t('menu.inbounds')}</h2>
          </div>
          <InboundsPage />
        </section>

        <section id="clients" className="feed-section">
          <div className="section-header">
            <h2>{t('menu.clients')}</h2>
          </div>
          <ClientsPage />
        </section>

        <section id="groups" className="feed-section">
          <div className="section-header">
            <h2>{t('menu.groups')}</h2>
          </div>
          <GroupsPage />
        </section>

        <section id="nodes" className="feed-section">
          <div className="section-header">
            <h2>{t('menu.nodes')}</h2>
          </div>
          <NodesPage />
        </section>
      </div>
    </div>
  );
}
