import { type Language, translations } from '../i18n';

interface WidgetMenuProps {
  language: Language;
  onClose: () => void;
}

export default function WidgetMenu({ language, onClose }: WidgetMenuProps) {
  const t = translations[language];

  return (
    <div className="widget-menu-panel">
      <div className="widget-menu-heading">
        <div>
          <span>{t.chat.menuEyebrow}</span>
          <h2>{t.chat.menuTitle}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label={t.chat.closeMenu}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <p>{t.chat.menuDescription}</p>
      <a href="/admin" target="_blank" rel="noreferrer">
        {t.chat.openAdminDashboard}
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
