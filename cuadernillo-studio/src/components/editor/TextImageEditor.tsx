import type { ChangeEvent } from 'react';

import type { TextImageElement } from '../../models/document';

type Props = {
  value: TextImageElement;
  onChange: (patch: Partial<TextImageElement>) => void;
};

export function TextImageEditor({ value, onChange }: Props) {
  const changeImage = (id: string, patch: Partial<TextImageElement['images'][number]>) => {
    onChange({ images: value.images.map(image => image.id === id ? { ...image, ...patch } : image) });
  };
  const readImage = async (event: ChangeEvent<HTMLInputElement>, id: string) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      alert('Selecciona un archivo PNG, JPG o WebP.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') changeImage(id, { src: reader.result });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  return (
    <div className="content-text-image-editor">
      <label>Texto
        <textarea rows={6} value={value.text} onChange={event => onChange({ text: event.target.value, richHtml: undefined })} />
      </label>
      <label>Ubicación de las imágenes
        <select value={value.side} onChange={event => onChange({ side: event.target.value as 'left' | 'right' })}>
          <option value="right">A la derecha</option>
          <option value="left">A la izquierda</option>
        </select>
      </label>
      <label>Proporción texto / imágenes
        <select value={value.textPercent} onChange={event => onChange({ textPercent: Number(event.target.value) as 50 | 60 | 70 })}>
          <option value={50}>50 % / 50 %</option>
          <option value={60}>60 % / 40 %</option>
          <option value={70}>70 % / 30 %</option>
        </select>
      </label>
      <label>Altura de cada imagen: {value.imageHeight} px
        <input type="range" min={55} max={220} step={5} value={value.imageHeight} onChange={event => onChange({ imageHeight: Number(event.target.value) })} />
      </label>
      <label>Separación: {value.gap} px
        <input type="range" min={0} max={20} step={2} value={value.gap} onChange={event => onChange({ gap: Number(event.target.value) })} />
      </label>
      {value.images.map((item, index) => (
        <div key={item.id} className="content-text-image-entry">
          <strong>Imagen {index + 1}</strong>
          <label>Subir imagen
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void readImage(event, item.id)} />
          </label>
          <label>Ruta de imagen
            <input value={item.src.startsWith('data:') ? '' : item.src} placeholder="/assets/imagen.jpg" onChange={event => changeImage(item.id, { src: event.target.value })} />
          </label>
          {item.src && <img src={item.src} alt={item.caption || `Imagen ${index + 1}`} style={{maxWidth: '100%',maxHeight: 130,objectFit:'contain'}} />}
          <label>Pie de imagen
            <input value={item.caption} onChange={event => changeImage(item.id, {caption:event.target.value})} />
          </label>
          {value.images.length > 1 && <button type="button" onClick={() => onChange({images:value.images.filter(image => image.id !== item.id)})}>Eliminar esta imagen</button>}
        </div>
      ))}
      <button type="button" disabled={value.images.length >= 4} onClick={() => onChange({images:[...value.images,{id:crypto.randomUUID(),src:'',caption:''}]})}>
        + Añadir imagen ({value.images.length}/4)
      </button>
    </div>
  );
}
