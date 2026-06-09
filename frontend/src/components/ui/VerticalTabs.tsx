import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import './VerticalTabs.css';

interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface VerticalTabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export default function VerticalTabs({ items, activeKey, onChange }: VerticalTabsProps) {
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({
    transform: 'translateY(0px)',
    height: '0px',
    opacity: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find the active tab element
    const activeEl = container.querySelector(`[data-tab-key="${activeKey}"]`) as HTMLElement | null;
    if (activeEl) {
      const parentRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();

      const topOffset = elRect.top - parentRect.top;
      setPillStyle({
        transform: `translateY(${topOffset}px)`,
        height: `${elRect.height}px`,
        width: `${elRect.width}px`,
        opacity: 1,
      });
    } else {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeKey, items]);

  return (
    <div
      ref={containerRef}
      className="vertical-tabs-container"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 4,
        background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(18, 19, 23, 0.03)',
        borderRadius: 20,
        border: isDark ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(18, 19, 23, 0.04)',
      }}
    >
      {/* Sliding Pill Active Indicator */}
      <div
        className="vertical-tabs-pill"
        style={{
          position: 'absolute',
          left: 4,
          top: 0,
          background: isDark ? 'rgba(50, 121, 249, 0.15)' : 'rgba(26, 115, 232, 0.08)',
          borderLeft: '3px solid #3279F9',
          borderRadius: '12px',
          pointerEvents: 'none',
          transition: 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), height 0.3s ease, width 0.3s ease, opacity 0.2s ease',
          ...pillStyle,
        }}
      />

      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            data-tab-key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`vtab-btn ${isActive ? 'is-active' : ''}`}
          >
            {item.icon && <span className="vtab-icon">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
