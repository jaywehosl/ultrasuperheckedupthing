import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, QrCode, Tag, Tooltip, TooltipProvider } from '@/components/ds';
import { CopyOutlined, DownloadOutlined, PictureOutlined } from '@ant-design/icons';

import { ClipboardManager, FileManager } from '@/utils';
import { getMessage } from '@/utils/messageBus';
import './QrPanel.css';

interface QrPanelProps {
  value: string;
  remark?: string;
  downloadName?: string;
  size?: number;
  showQr?: boolean;
}

async function svgToPngBlob(svgEl: SVGSVGElement | null, size: number): Promise<Blob | null> {
  if (!svgEl) return null;
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  return new Promise<Blob | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(null);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function downloadImageBlob(blob: Blob, remark: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${remark || 'qrcode'}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function QrPanel({
  value,
  remark = '',
  downloadName = '',
  size = 360,
  showQr = true,
}: QrPanelProps) {
  const { t } = useTranslation();
  const qrRef = useRef<HTMLDivElement | null>(null);

  async function copy() {
    const ok = await ClipboardManager.copyText(value);
    if (ok) getMessage().success(t('copied'));
  }

  function download() {
    if (!downloadName) return;
    FileManager.downloadTextFile(value, downloadName);
  }

  async function copyImage() {
    const svgEl = qrRef.current?.querySelector('svg') as SVGSVGElement | null;
    const blob = await svgToPngBlob(svgEl, size);
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      getMessage().success(t('copied'));
    } catch {
      downloadImageBlob(blob, remark);
    }
  }

  async function downloadImage() {
    const svgEl = qrRef.current?.querySelector('svg') as SVGSVGElement | null;
    const blob = await svgToPngBlob(svgEl, size);
    if (blob) downloadImageBlob(blob, remark);
  }

  return (
    <TooltipProvider>
      <div className="qr-panel">
        <div className="qr-panel-header">
          <Tag tone="success" className="qr-remark">{remark}</Tag>
          <Tooltip title={t('copy')}>
            <Button size="sm" icon={<CopyOutlined />} onClick={copy} />
          </Tooltip>
          {showQr && (
            <Tooltip title={t('downloadImage') !== 'downloadImage' ? t('downloadImage') : 'Download Image'}>
              <Button size="sm" icon={<PictureOutlined />} onClick={downloadImage} />
            </Tooltip>
          )}
          {downloadName && (
            <Tooltip title={t('download')}>
              <Button size="sm" icon={<DownloadOutlined />} onClick={download} />
            </Tooltip>
          )}
        </div>
        {showQr && (
          <div ref={qrRef} className="qr-panel-canvas">
            <Tooltip title={t('copy')}>
              <span className="qr-code" role="button" tabIndex={0} onClick={copyImage} style={{ cursor: 'pointer', display: 'inline-flex' }}>
                <QrCode value={value} size={size} />
              </span>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
