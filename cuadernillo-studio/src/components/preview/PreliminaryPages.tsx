
import type { CoverSettings } from '../../models/document';

type Props = {
  settings: CoverSettings;
};


export function CoverPage({ settings }: Props) {
  const template = settings.template ?? 'academic';
  const accent = settings.accentColor ?? '#1766c2';

  return (
    <div
      className={`paper cover-paper cover-${template}`}
      style={{
        '--cover-accent': accent,
      } as React.CSSProperties}
    >
      <div className="cover-top">
        {settings.schoolLogo && (
          <img
            src={settings.schoolLogo}
            alt="Logotipo de la escuela"
            className="cover-school-logo"
          />
        )}

        <span>CUADERNILLO DE TRABAJO</span>

        {settings.school && <p>{settings.school}</p>}
      </div>

      <div className="cover-center">
        {settings.coverImage ? (
          <img
            src={settings.coverImage}
            alt="Ilustración de portada"
            className="cover-main-image"
          />
        ) : (
          <div className="cover-decoration" />
        )}

        <span className="cover-subject">
          {settings.subject}
        </span>

        <h1>{settings.title}</h1>

        {settings.subtitle && <p>{settings.subtitle}</p>}

        <div className="cover-grade">
          {settings.grade}
        </div>
      </div>

      <div className="cover-bottom">
        {settings.author && (
          <p>Elaborado por: {settings.author}</p>
        )}

        {settings.schoolYear && (
          <p>Ciclo escolar {settings.schoolYear}</p>
        )}
      </div>
    </div>
  );
}


export function PresentationPage({ settings }: Props) {
  return (
    <div className="paper presentation-paper">
      <div className="presentation-heading">
        <span>CUADERNILLO DE TRABAJO</span>
        <h1>Presentación</h1>
      </div>

      <div className="presentation-body">
        {settings.presentation.trim()
          ? settings.presentation
          : 'Escribe aquí la presentación del cuadernillo.'}
      </div>

      <div className="presentation-bottom">
        {settings.title}
      </div>
    </div>
  );
}
