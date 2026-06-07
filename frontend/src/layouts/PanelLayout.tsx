import { Outlet } from 'react-router-dom';
import AppSidebar from '@/layouts/AppSidebar';
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
        intensity={isDark ? 1.5 : 0.7}
        density={0.8}
      />
      <div className="ambient-sphere ambient-sphere-1" />
      <div className="ambient-sphere ambient-sphere-2" />
      <div className="ambient-sphere ambient-sphere-3" />
      <AppSidebar />
      <div className="panel-main-content">
        <Outlet />
      </div>
    </div>
  );
}
