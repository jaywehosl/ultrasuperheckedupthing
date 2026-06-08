import { Outlet } from 'react-router-dom';
import AppSidebar from '@/layouts/AppSidebar';
import { MetricsPanelProvider } from '@/layouts/MetricsPanelContext';
import MetricsPanel from '@/pages/index/MetricsPanel';
import { useWebSocketBridge } from '@/api/websocketBridge';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useTheme } from '@/hooks/useTheme';
import ParticleField from '@/components/ui/ParticleField';

export default function PanelLayout() {
  useWebSocketBridge();
  usePageTitle();
  const { isDark, isUltra } = useTheme();
  
  const pageClass = `panel-app-wrapper ${isDark ? 'is-dark' : ''} ${isUltra ? 'is-ultra' : ''}`.trim();

  return (
    <div className={pageClass}>
      <ParticleField
        className="panel-particle-canvas"
        additive={isDark}
        intensity={isDark ? 1.7 : 0.95}
        density={1}
      />
      <MetricsPanelProvider>
        <AppSidebar />
        <MetricsPanel />
        <div className="panel-main-content">
          <Outlet />
        </div>
      </MetricsPanelProvider>
    </div>
  );
}
