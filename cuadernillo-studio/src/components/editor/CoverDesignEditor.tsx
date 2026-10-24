
import type { CoverSettings } from '../../models/document';

type Props = {
  cover: CoverSettings;
  onChange: (
    field: keyof CoverSettings,
    value: string
  ) => void;
};

const COLORS = [
  '#1766c2',
  '#188466',
  '#c15a25',
  '#773eae',
];

export function CoverDesignEditor({
  cover,
  onChange,
}: Props) {
  const upload = (
    field: 'coverImage' | 'schoolLogo',
    file?: File
  ) => {
    if (!file) return;

    if (
      !['image/jpeg', 'image/png', 'image/webp']
        .includes(file.type)
    ) {
      alert('Utiliza JPG, PNG o WebP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar 2 MB.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(field, reader.result);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="cover-design-editor">
      <h3>Diseño de portada</h3>

      <label className="pdf-dialog-field">
        Plantilla
        <select
          value={cover.template ?? 'academic'}
          onChange={(event) =>
            onChange('template', event.target.value)
          }
        >
          <option value="academic">Académica</option>
          <option value="modern">Moderna</option>
          <option value="minimal">Minimalista</option>
        </select>
      </label>

      <div className="cover-color-options">
        <strong>Color principal</strong>

        <div className="cover-color-row">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={
                (cover.accentColor ?? COLORS[0]) === color
                  ? 'cover-color selected'
                  : 'cover-color'
              }
              style={{ backgroundColor: color }}
              aria-label={`Elegir color ${color}`}
              aria-pressed={
                (cover.accentColor ?? COLORS[0]) === color
              }
              onClick={() =>
                onChange('accentColor', color)
              }
            />
          ))}
        </div>
      </div>

      {([
        ['schoolLogo', 'Logotipo de la escuela'],
        ['coverImage', 'Imagen principal'],
      ] as const).map(([field, label]) => (
        <div className="cover-upload" key={field}>
          <label className="pdf-dialog-field">
            {label}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                upload(field, event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>

          {cover[field] && (
            <>
              <img
                src={cover[field]}
                alt={label}
                className="cover-upload-preview"
              />

              <button
                type="button"
                onClick={() => onChange(field, '')}
              >
                Quitar imagen
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
