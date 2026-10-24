import DOMPurify from 'dompurify';
import type { TextImageElement } from '../../models/document';

type Props = { value: TextImageElement; className?: string; onClick?: (event: React.MouseEvent) => void };

export function TextImageView({ value, className, onClick }: Props) {
  const textPercent = [50, 60, 70].includes(value.textPercent) ? value.textPercent : 60;
  const images = value.images.slice(0, 4);
  const side = value.side === 'left' ? 'left' : 'right';
  const gap = Math.max(0, Math.min(20, value.gap ?? 8));
  const imageHeight = Math.max(55, Math.min(220, value.imageHeight ?? 95));
  return (
    <div className={`workbook-text-image ${className ?? ''}`} onClick={onClick}
      style={{ gridTemplateColumns: side === 'right' ? `${textPercent}fr ${100-textPercent}fr` : `${100-textPercent}fr ${textPercent}fr`, gap }}>
      <div className="workbook-text-image-text" style={{gridColumn:side==='right'?1:2}}>
        {value.richHtml ? (
          <div className="rich-text-rendered" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(value.richHtml, {ALLOWED_TAGS:['p','br','strong','b','em','i','u','ul','ol','li'],ALLOWED_ATTR:[]})}} />
        ) : value.text}
      </div>
      <div className="workbook-text-image-images" style={{gridColumn:side==='right'?2:1,gridRow:1,gap}}>
        {images.map(image => (
          <figure key={image.id} className="workbook-text-image-figure">
            {image.src ? <img src={image.src} alt={image.caption || 'Imagen educativa'} style={{height:imageHeight}} /> : <div className="workbook-text-image-placeholder" style={{height:imageHeight}}>Imagen pendiente</div>}
            {image.caption.trim() && <figcaption>{image.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </div>
  );
}
