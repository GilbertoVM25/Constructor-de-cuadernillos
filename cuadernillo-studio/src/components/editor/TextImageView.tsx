import { useState, type MouseEvent } from 'react';
import DOMPurify from 'dompurify';
import type { TextImageElement } from '../../models/document';

type Props = {
  value: TextImageElement;
  className?: string;
  onClick?: (event: MouseEvent) => void;
};

type ImageItem = TextImageElement['images'][number];

/**
 * Ajusta el tamaño del elemento <img> sin crear franjas vacías.
 * El alto configurado es un máximo; el ancho se calcula usando
 * la relación de aspecto REAL del archivo cargado.
 */
function ImageWithNaturalRatio({
  image,
  maxHeight,
}: {
  image: ImageItem;
  maxHeight: number;
}) {
  const [ratio, setRatio] = useState<number | null>(null);

  const imageWidth = ratio
    ? `min(100%, ${Math.round(maxHeight * ratio * 100) / 100}px)`
    : '100%';

  return (
    <figure className="workbook-text-image-figure">
      {image.src ? (
        <img
          src={image.src}
          alt={image.caption || 'Imagen educativa'}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            if (naturalWidth > 0 && naturalHeight > 0) {
              const nextRatio = naturalWidth / naturalHeight;
              setRatio((previous) =>
                previous !== null && Math.abs(previous - nextRatio) < 0.0001
                  ? previous
                  : nextRatio
              );
            }
          }}
          style={{
            display: 'block',
            width: imageWidth,
            height: 'auto',
            maxWidth: '100%',
            maxHeight: 'none',
            objectFit: 'fill',
            margin: '0 auto',
          }}
        />
      ) : (
        <div
          className="workbook-text-image-placeholder"
          style={{ height: maxHeight }}
        >
          Imagen pendiente
        </div>
      )}
      {image.caption.trim() && <figcaption>{image.caption}</figcaption>}
    </figure>
  );
}

export function TextImageView({ value, className, onClick }: Props) {
  const textPercent = [50, 60, 70].includes(value.textPercent)
    ? value.textPercent
    : 60;
  const images = value.images.slice(0, 4);
  const side = value.side === 'left' ? 'left' : 'right';
  const gap = Math.max(0, Math.min(20, value.gap ?? 8));
  const imageHeight = Math.max(55, Math.min(220, value.imageHeight ?? 95));

  return (
    <div
      className={`workbook-text-image ${className ?? ''}`}
      onClick={onClick}
      style={{
        gridTemplateColumns:
          side === 'right'
            ? `${textPercent}fr ${100 - textPercent}fr`
            : `${100 - textPercent}fr ${textPercent}fr`,
        gap,
      }}
    >
      <div
        className="workbook-text-image-text"
        style={{ gridColumn: side === 'right' ? 1 : 2 }}
      >
        {value.richHtml ? (
          <div
            className="rich-text-rendered"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(value.richHtml, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li'],
                ALLOWED_ATTR: [],
              }),
            }}
          />
        ) : (
          value.text
        )}
      </div>
      <div
        className="workbook-text-image-images"
        style={{
          gridColumn: side === 'right' ? 2 : 1,
          gridRow: 1,
          gap,
        }}
      >
        {images.map((image) => (
          <ImageWithNaturalRatio
            key={image.id}
            image={image}
            maxHeight={imageHeight}
          />
        ))}
      </div>
    </div>
  );
}
