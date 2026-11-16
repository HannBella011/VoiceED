// ServiceCard - VoiceED
// Service feature card component

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export function ServiceCard({
  icon,
  title,
  description,
  features,
  onClick,
  href,
  className = '',
  style,
}) {
  const router = useRouter();

  const handleClick = (e) => {
    if (href) {
      e.preventDefault();
      router.push(href);
    } else if (onClick) {
      onClick();
    }
  };

  const isClickable = !!href || !!onClick;

  return (
    <div
      className={`service-box ${isClickable ? 'service-box-clickable' : ''} ${className}`}
      onClick={handleClick}
      style={isClickable ? { cursor: 'pointer', ...style } : style}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) =>
        isClickable && (e.key === 'Enter' || e.key === ' ') && handleClick(e)
      }
    >
      <div className="service-header">
        <div className="service-icon">{icon}</div>
        <h3>{title}</h3>
      </div>
      <div className="service-details">
        <p>{description}</p>
        <div className="service-features">
          {features.map((feature, index) => (
            <div key={index} className="feature-item">
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ServiceCard;
