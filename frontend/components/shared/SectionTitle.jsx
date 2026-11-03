// SectionTitle - VoiceED
// Section heading component

'use client';

import React from 'react';

export function SectionTitle({
  title,
  subtitle,
  className = '',
  align = 'center',
  icon,
}) {
  const alignClass = `text-${align}`;

  return (
    <div className={`section-title ${alignClass} ${className}`}>
      {icon && <div className="section-title-icon">{icon}</div>}
      {title && <h2 className="section-title-main">{title}</h2>}
      {subtitle && <p className="section-title-sub">{subtitle}</p>}
    </div>
  );
}

export default SectionTitle;
