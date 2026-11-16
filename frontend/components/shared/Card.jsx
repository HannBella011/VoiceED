// Card - VoiceED
// Flexible card component

'use client';

import React from 'react';

export function Card({
  variant = 'default',
  icon,
  title,
  description,
  children,
  onClick,
  href,
  className = '',
  style,
  ...props
}) {
  const variantClass = `card-${variant}`;
  const clickableClass = onClick || href ? 'card-clickable' : '';
  const combinedClassName = ['card', variantClass, clickableClass, className]
    .filter(Boolean)
    .join(' ');

  const handleKeyDown = (e) => {
    if ((onClick || href) && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick?.();
    }
  };

  const Content = href ? 'a' : 'div';

  return (
    <Content
      className={combinedClassName}
      onClick={onClick}
      href={href}
      onKeyDown={handleKeyDown}
      role={onClick || href ? 'button' : undefined}
      tabIndex={onClick || href ? 0 : undefined}
      style={style}
      {...props}
    >
      {icon && <div className="card-icon">{icon}</div>}
      {title && <h3 className="card-title">{title}</h3>}
      {description && <p className="card-description">{description}</p>}
      {children}
    </Content>
  );
}

export default Card;
