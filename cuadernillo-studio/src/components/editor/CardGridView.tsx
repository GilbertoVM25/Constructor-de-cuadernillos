import type { CardGridElement } from '../../models/document';

type Props = { value: CardGridElement; className?: string; onClick?: (event: React.MouseEvent<HTMLDivElement>) => void };

export function CardGridView({ value, className = '', onClick }: Props) {
  const cols = Math.min(5, Math.max(2, value.columns || 3));
  return (
    <div className={`workbook-card-grid ${className}`} onClick={onClick}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: Math.max(0, value.gap ?? 8) }}>
      {value.cards.map((card) => (
        <section key={card.id} className="workbook-info-card" style={{ borderColor: card.borderColor || '#e9a15c' }}>
          <strong className="workbook-info-card-title" style={{ color: card.titleColor || '#d65b20' }}>{card.title}</strong>
          {card.imagePosition === 'top' && <CardImage card={card} height={value.imageHeight} />}
          <div className="workbook-info-card-text">{card.text}</div>
          {card.imagePosition !== 'top' && <CardImage card={card} height={value.imageHeight} />}
        </section>
      ))}
    </div>
  );
}

function CardImage({ card, height }: { card: CardGridElement['cards'][number]; height: number }) {
  if (!card.image) return null;
  return <div className="workbook-info-card-media" style={{ height: Math.max(40, Math.min(230, height || 95)) }}>
    <img src={card.image} alt={card.title} onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} />
  </div>;
}
