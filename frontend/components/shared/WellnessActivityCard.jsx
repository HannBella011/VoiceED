// WellnessActivityCard - VoiceED
// Wellness activity card component

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export function WellnessActivityCard({
  icon,
  title,
  description,
  buttonText,
  href,
  variant = 'activity',
}) {
  const router = useRouter();

  const handleClick = (e) => {
    e.preventDefault();
    router.push(href);
  };

  const variantClass = variant === 'activity' ? 'activity-card' : '';

  return (
    <div className={`wellness-card ${variantClass}`}>
      <div className="card-header">
        <div className="card-icon">{icon}</div>
        <h3>{title}</h3>
      </div>
      <div className="card-body">
        <p className="card-description">{description}</p>
        <button className="card-btn" onClick={handleClick}>
          {buttonText} <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
}

export default WellnessActivityCard;
