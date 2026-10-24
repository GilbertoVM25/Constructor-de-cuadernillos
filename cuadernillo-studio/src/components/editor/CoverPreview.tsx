
import {
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import type {
  CoverSettings,
} from '../../models/document';

import {
  CoverPage,
} from '../preview/PreliminaryPages';

type Props = {
  settings: CoverSettings;
};

const PAGE_WIDTH = (210 / 25.4) * 96;
const PAGE_HEIGHT = (297 / 25.4) * 96;

export function CoverPreview({ settings }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const availableWidth = container.clientWidth;

      if (availableWidth <= 0) return;

      setScale(
        Math.min(1, availableWidth / PAGE_WIDTH)
      );
    };

    const observer = new ResizeObserver(updateScale);

    observer.observe(container);
    updateScale();

    return () => observer.disconnect();
  }, []);

  return (
    <div className="cover-preview-panel">
      <div className="cover-preview-heading">
        <strong>Vista previa</strong>
        <span>A4 · Vertical</span>
      </div>

      <div
        className="cover-preview-viewport"
        ref={containerRef}
      >
        <div
          className="cover-preview-frame"
          style={{
            width: PAGE_WIDTH * scale,
            height: PAGE_HEIGHT * scale,
          }}
        >
          <div
            className="cover-preview-scale"
            style={{
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              transform: `scale(${scale})`,
            }}
          >
            <CoverPage settings={settings} />
          </div>
        </div>
      </div>

      <p className="cover-preview-note">
        La portada se actualiza automáticamente
        al modificar sus datos, plantilla o imágenes.
      </p>
    </div>
  );
}
