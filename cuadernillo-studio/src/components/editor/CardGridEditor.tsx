import type { CardGridElement } from '../../models/document';

type Props = { value: CardGridElement; onChange: (patch: Partial<CardGridElement>) => void };
const newCard = (): CardGridElement['cards'][number] => ({ id: crypto.randomUUID(), title: 'Nuevo concepto', text: 'Descripción...', image: '', imagePosition: 'bottom' });
export function CardGridEditor({ value, onChange }: Props) {
  const updateCard = (id: string, patch: Partial<CardGridElement['cards'][number]>) => {
    onChange({ cards: value.cards.map(card => card.id === id ? { ...card, ...patch } : card) });
  };
  const upload = (id: string, file: File) => {
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      alert('Utiliza JPG, PNG o WebP de hasta 2 MB.'); return;
    }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') updateCard(id, { image: reader.result }); };
    reader.readAsDataURL(file);
  };
  return <div className="card-grid-editor">
    <label>Tarjetas por fila
      <select value={value.columns} onChange={e => onChange({ columns: Number(e.target.value) as 2 | 3 | 4 | 5 })}>
        <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
      </select>
    </label>
    <label>Separación (px) <input type="number" min={0} max={30} value={value.gap} onChange={e => onChange({ gap: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })}/></label>
    <label>Altura reservada para imagen (px) <input type="number" min={40} max={230} value={value.imageHeight} onChange={e => onChange({ imageHeight: Math.max(40, Math.min(230, Number(e.target.value) || 40)) })}/></label>
    {value.cards.map((card, index) => <fieldset key={card.id} className="card-grid-editor-card">
      <legend>Tarjeta {index + 1}</legend>
      <label>Título <input value={card.title} onChange={e => updateCard(card.id, { title: e.target.value })}/></label>
      <label>Descripción <textarea rows={3} value={card.text} onChange={e => updateCard(card.id, { text: e.target.value })}/></label>
      <label>Ruta de imagen <input value={card.image} placeholder="/assets/metodo.png" onChange={e => updateCard(card.id, { image: e.target.value })}/></label>
      <label>Subir imagen <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; if(file) upload(card.id, file); e.currentTarget.value = ''; }}/></label>
      <label>Ubicación <select value={card.imagePosition ?? 'bottom'} onChange={e => updateCard(card.id, { imagePosition: e.target.value as 'top' | 'bottom' })}><option value="bottom">Debajo</option><option value="top">Arriba</option></select></label>
      <label>Color del título <input type="color" value={card.titleColor || '#d65b20'} onChange={e => updateCard(card.id, { titleColor: e.target.value })}/></label>
      <label>Color del borde <input type="color" value={card.borderColor || '#e9a15c'} onChange={e => updateCard(card.id, { borderColor: e.target.value })}/></label>
      <div className="card-grid-editor-actions">
        <button type="button" disabled={index === 0} onClick={() => { const cards = [...value.cards]; [cards[index - 1], cards[index]] = [cards[index], cards[index - 1]]; onChange({cards}); }}>↑</button>
        <button type="button" disabled={index === value.cards.length - 1} onClick={() => { const cards = [...value.cards]; [cards[index + 1], cards[index]] = [cards[index], cards[index + 1]]; onChange({cards}); }}>↓</button>
        <button type="button" onClick={() => onChange({cards: value.cards.filter(c => c.id !== card.id)})}>Eliminar tarjeta</button>
      </div>
    </fieldset>)}
    <button type="button" onClick={() => onChange({cards: [...value.cards, newCard()]})}>+ Añadir tarjeta</button>
  </div>;
}
