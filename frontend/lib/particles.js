// Digital particle effects for VoiceED theme
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '1';
    this.container.style.overflow = 'hidden';
    document.body.appendChild(this.container);

    this.init();
  }

  init() {
    // Create floating particles
    for (let i = 0; i < 30; i++) {
      this.createParticle();
    }

    // Animate particles
    this.animate();
  }

  createParticle() {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = Math.random() * 3 + 'px';
    particle.style.height = particle.style.width;
    particle.style.background = `rgba(0, 212, 255, ${Math.random() * 0.8 + 0.2})`;
    particle.style.borderRadius = '50%';
    particle.style.boxShadow = `0 0 ${Math.random() * 10 + 5}px rgba(0, 212, 255, ${Math.random() * 0.5})`;
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';

    this.container.appendChild(particle);

    this.particles.push({
      element: particle,
      x: parseFloat(particle.style.left),
      y: parseFloat(particle.style.top),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: parseFloat(particle.style.width),
    });
  }

  animate() {
    this.particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Wrap around edges
      if (particle.x < 0) particle.x = 100;
      if (particle.x > 100) particle.x = 0;
      if (particle.y < 0) particle.y = 100;
      if (particle.y > 100) particle.y = 0;

      particle.element.style.left = particle.x + '%';
      particle.element.style.top = particle.y + '%';

      // Pulsing effect
      const scale = 1 + Math.sin(Date.now() * 0.001 + particle.x) * 0.2;
      particle.element.style.transform = `scale(${scale})`;
    });

    requestAnimationFrame(() => this.animate());
  }
}

// Authentication, settings and profile actions are owned by React.
new ParticleSystem();
