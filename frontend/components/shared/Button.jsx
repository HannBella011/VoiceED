// Button - VoiceED
// Polymorphic button component

'use client';

import React from 'react';

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  iconOnly = false,
  children,
  className = '',
  disabled,
  type = 'button',
  onClick,
  ...props
}) {
  const baseClasses = 'btn';
  // Keep legacy selectors while sharing the classes used by existing pages.
  const variantClass = `btn-${variant} btn--${variant}`;
  const sizeClass = `btn-${size} btn--${size}`;
  const loadingClass = isLoading ? 'btn-loading' : '';
  const disabledClass = disabled ? 'btn-disabled' : '';

  const combinedClassName = [
    baseClasses,
    variantClass,
    sizeClass,
    loadingClass,
    disabledClass,
    iconOnly ? 'btn--icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={combinedClassName}
      disabled={disabled || isLoading}
      type={type}
      aria-busy={isLoading || undefined}
      onClick={onClick}
      {...props}
    >
      {isLoading && <span className="btn-spinner" aria-hidden="true" />}
      <span className="btn-text">{children}</span>
    </button>
  );
}

export default Button;
