import React, { useEffect, useState } from 'react';
import '../styles/CelebrationEffect.css';

function CelebrationEffect({ isActive }) {
  const [confetti, setConfetti] = useState([]);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (isActive) {
      // Create confetti pieces for falling effect
      const newConfetti = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.5 + Math.random() * 1.5,
        size: 4 + Math.random() * 8,
        color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F38181', '#AA96DA'][
          Math.floor(Math.random() * 8)
        ],
        rotation: Math.random() * 360,
      }));
      setConfetti(newConfetti);

      // Create floating particles for background animation
      const newParticles = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 4 + Math.random() * 3,
        size: 2 + Math.random() * 5,
        color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][
          Math.floor(Math.random() * 6)
        ],
        opacity: 0.3 + Math.random() * 0.5,
      }));
      setParticles(newParticles);

      // Clear celebration after animation completes
      const timer = setTimeout(() => {
        setConfetti([]);
        setParticles([]);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isActive]);

  return (
    <>
      {isActive && (
        <>
          {/* Background animation layer */}
          <div className="celebration-background">
            {particles.map((particle) => (
              <div
                key={`particle-${particle.id}`}
                className="floating-particle"
                style={{
                  left: `${particle.left}%`,
                  top: `${particle.top}%`,
                  '--delay': `${particle.delay}s`,
                  '--duration': `${particle.duration}s`,
                  '--size': `${particle.size}px`,
                  '--color': particle.color,
                  '--opacity': particle.opacity,
                }}
              />
            ))}
            {/* Gradient background effect */}
            <div className="celebration-gradient" />
          </div>

          {/* Falling confetti */}
          <div className="confetti-container">
            {confetti.map((particle) => (
              <div
                key={`confetti-${particle.id}`}
                className="confetti"
                style={{
                  left: `${particle.left}%`,
                  '--delay': `${particle.delay}s`,
                  '--duration': `${particle.duration}s`,
                  '--size': `${particle.size}px`,
                  '--color': particle.color,
                  '--rotation': `${particle.rotation}deg`,
                }}
              />
            ))}
          </div>

          {/* Sparkles effect */}
          <div className="celebration-sparkles" />
        </>
      )}
    </>
  );
}

export default CelebrationEffect;
