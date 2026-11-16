// Hero - VoiceED
// Hero section component

'use client';

import React from 'react';

export function Hero({
  title,
  subtitle,
  description,
  ctaText,
  ctaHref,
  ctaOnClick,
  className = '',
  variant = 'default',
  children,
}) {
  const variantClass = `hero-${variant}`;

  return (
    <section className={`hero ${variantClass} ${className}`}>
      <div className="container">
        <div className="hero-content">
          {subtitle && <p className="hero-subtitle">{subtitle}</p>}
          {title && <h1 className="hero-title">{title}</h1>}
          {description && <p className="hero-description">{description}</p>}
          {ctaText && (ctaHref || ctaOnClick) && (
            <a
              href={ctaHref}
              onClick={(e) => {
                if (ctaOnClick) {
                  e.preventDefault();
                  ctaOnClick();
                }
              }}
              className="hero-cta"
            >
              {ctaText}
            </a>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}

export default Hero;
