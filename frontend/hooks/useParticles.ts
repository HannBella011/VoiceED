'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  element: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export function useParticles() {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationIdRef = useRef<number>(null);
  const initializedRef = useRef(false);

  const createParticle = useCallback(() => {
    if (!containerRef.current) return;

    const particle = document.createElement('div');
    const size = Math.random() * 3 + 1;
    
    particle.style.position = 'absolute';
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = `rgba(0, 212, 255, ${Math.random() * 0.8 + 0.2})`;
    particle.style.borderRadius = '50%';
    particle.style.boxShadow = `0 0 ${Math.random() * 10 + 5}px rgba(0, 212, 255, ${Math.random() * 0.5})`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;

    containerRef.current.appendChild(particle);

    particlesRef.current.push({
      element: particle,
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size,
    });
  }, []);

  const animate = useCallback(() => {
    particlesRef.current.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Wrap around edges
      if (particle.x < 0) particle.x = 100;
      if (particle.x > 100) particle.x = 0;
      if (particle.y < 0) particle.y = 100;
      if (particle.y > 100) particle.y = 0;

      particle.element.style.left = `${particle.x}%`;
      particle.element.style.top = `${particle.y}%`;

      // Pulsing effect
      const scale = 1 + Math.sin(Date.now() * 0.001 + particle.x) * 0.2;
      particle.element.style.transform = `scale(${scale})`;
    });

    animationIdRef.current = requestAnimationFrame(animate);
  }, []);

  const init = useCallback(() => {
    if (initializedRef.current || !containerRef.current) return;
    
    // Create floating particles
    for (let i = 0; i < 30; i++) {
      createParticle();
    }

    animate();
    initializedRef.current = true;
  }, [createParticle, animate]);

  useEffect(() => {
    // Create container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '1';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);
    containerRef.current = container;

    init();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
      }
      particlesRef.current = [];
      initializedRef.current = false;
    };
  }, [init]);

  return containerRef;
}

export default useParticles;