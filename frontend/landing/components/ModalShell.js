import React, { useEffect } from 'react';

export default function ModalShell({
  open,
  title,
  onClose,
  children,
  footer,
  welcome = false,
  labelledBy,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="rw-modal-root" role="presentation">
      <button type="button" className="rw-modal__backdrop" aria-label="Close dialog" onClick={onClose} />
      <div
        className={`rw-modal__panel${welcome ? ' rw-modal__panel--welcome' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {welcome ? (
          children
        ) : (
          <>
            <div className="rw-modal__header">
              <h2 id={labelledBy}>{title}</h2>
              <button type="button" className="rw-modal__close" aria-label="Close" onClick={onClose}>
                ×
              </button>
            </div>
            <div className="rw-modal__body">{children}</div>
            {footer ? <div className="rw-modal__footer">{footer}</div> : null}
          </>
        )}
      </div>
    </div>
  );
}
