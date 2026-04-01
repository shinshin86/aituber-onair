import { type ReactNode, useState } from 'react';

export interface CollapsibleCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export function CollapsibleCard({
  title,
  description,
  children,
  className,
  defaultOpen = false,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const rootClassName = ['collapsible-card', className]
    .filter(Boolean)
    .join(' ');
  const panelClassName = ['collapsible-card__panel', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName}>
      <button
        type="button"
        className="collapsible-card__trigger"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <span className="collapsible-card__title">{title}</span>
        <span className="collapsible-card__icon" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      <div
        className={panelClassName}
        style={{ display: isOpen ? 'block' : 'none' }}
        aria-hidden={!isOpen}
      >
        {description ? (
          <p className="collapsible-card__description">{description}</p>
        ) : null}
        <div className="collapsible-card__content">{children}</div>
      </div>
    </div>
  );
}
