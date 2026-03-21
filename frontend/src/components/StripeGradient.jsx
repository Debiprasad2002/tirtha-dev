import React, { useEffect, useRef } from 'react';
import '../styles/StripeGradient.css';

function StripeGradient({ isActive }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    
    canvas.width = rect.width;
    canvas.height = rect.height;

    const colors = [
      { r: 255, g: 107, b: 107 },    // #FF6B6B - Red
      { r: 249, g: 212, b: 35 },     // #F9D423 - Yellow
      { r: 107, g: 203, b: 255 },    // #6BCBFF - Cyan
      { r: 168, g: 85, b: 247 },     // #A855F7 - Purple
      { r: 255, g: 160, b: 122 },    // #FFA07A - Salmon
    ];

    const animate = () => {
      timeRef.current += 0.003;

      // Create multiple gradient points that flow
      const points = [];
      for (let i = 0; i < 5; i++) {
        const angle = (timeRef.current * 0.5 + (i * Math.PI * 2) / 5);
        const radius = Math.min(canvas.width, canvas.height) * 0.6;
        
        points.push({
          x: canvas.width / 2 + Math.cos(angle) * radius,
          y: canvas.height / 2 + Math.sin(angle) * radius,
          color: colors[(i + Math.floor(timeRef.current)) % colors.length],
        });
      }

      // Create smooth gradient
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height)
      );

      // Add flowing color stops
      const time = timeRef.current % 1;
      
      gradient.addColorStop(0, `rgba(${colors[0].r}, ${colors[0].g}, ${colors[0].b}, 0.3)`);
      
      const c1 = colors[Math.floor(time * colors.length) % colors.length];
      const c2 = colors[(Math.floor(time * colors.length) + 1) % colors.length];
      const blend = time * colors.length % 1;
      
      const blendedR = Math.round(c1.r + (c2.r - c1.r) * blend);
      const blendedG = Math.round(c1.g + (c2.g - c1.g) * blend);
      const blendedB = Math.round(c1.b + (c2.b - c1.b) * blend);
      
      gradient.addColorStop(0.5, `rgba(${blendedR}, ${blendedG}, ${blendedB}, 0.15)`);
      gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add flowing ribbons effect
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const nextPoint = points[(i + 1) % points.length];
        
        const gradient2 = ctx.createLinearGradient(
          point.x,
          point.y,
          nextPoint.x,
          nextPoint.y
        );

        const opacity = 0.15 + Math.sin(timeRef.current + i) * 0.1;
        gradient2.addColorStop(0, `rgba(${point.color.r}, ${point.color.g}, ${point.color.b}, ${opacity})`);
        gradient2.addColorStop(1, `rgba(${nextPoint.color.r}, ${nextPoint.color.g}, ${nextPoint.color.b}, ${opacity * 0.5})`);

        ctx.fillStyle = gradient2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 100 + Math.sin(timeRef.current + i) * 30, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      const newRect = canvas.parentElement.getBoundingClientRect();
      canvas.width = newRect.width;
      canvas.height = newRect.height;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="stripe-gradient-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}

export default StripeGradient;
