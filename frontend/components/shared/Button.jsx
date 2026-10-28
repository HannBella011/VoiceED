'use client';

import React from 'react';

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) {
  const baseClasses = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const loadingClass = isLoading ? 'btn-loading' : '';
  const disabledClass = disabled ? 'btn-disabled' : '';

  const combinedClassName = [baseClasses, variantClass, sizeClass, loadingClass, disabledClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={combinedClassName}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span className="btn-spinner" aria-hidden="true" />}
      <span className="btn-text">{children}</span>
    </button>
  );
}

export default Button;