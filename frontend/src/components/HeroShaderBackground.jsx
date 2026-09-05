import React, { useEffect, useRef, useState } from 'react';

/**
 * HeroShaderBackground
 * 
 * Recreates the exact Stripe / Fluted Glass shader background from the Emily Email Assistant landing page:
 * - Animated diagonal (31°) refraction stripes with high-speed wave oscillation
 * - Glowing ChromaFlow liquid bloom (indigo #4642ff, sky blue #56c2fc, violet #7f66ff)
 * - Real-time cursor momentum physics with spring damping
 * - Support for WebGPU `shaders/react` (Shader + Swirl + ChromaFlow + FlutedGlass + FilmGrain)
 * - Ultra-fast, 60fps GPU-accelerated canvas fallback for 100% device compatibility
 */
export default function HeroShaderBackground() {
  const [ShaderComponents, setShaderComponents] = useState(null);
  const [shaderError, setShaderError] = useState(false);
  const canvasRef = useRef(null);

  // 1. Dynamic import of official `shaders/react` library
  useEffect(() => {
    let isMounted = true;
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      import('shaders/react')
        .then((mod) => {
          if (isMounted && mod.Shader && mod.ChromaFlow && mod.FlutedGlass) {
            setShaderComponents(mod);
          } else if (isMounted) {
            setShaderError(true);
          }
        })
        .catch(() => {
          if (isMounted) setShaderError(true);
        });
    } else {
      setShaderError(true);
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. High-speed animated Fluted Stripe Canvas with Cursor Momentum
  useEffect(() => {
    if (ShaderComponents && !shaderError) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    // Cursor position & spring physics
    const target = { x: width * 0.55, y: height * 0.45 };
    const current = { x: width * 0.55, y: height * 0.45 };
    const velocity = { x: 0, y: 0 };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      target.x = e.clientX - rect.left;
      target.y = e.clientY - rect.top;
    };

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);

    let time = 0;
    const render = () => {
      // Faster animation speed as requested
      time += 0.032;

      // Spring physics momentum for cursor tracking
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      velocity.x += dx * 0.08;
      velocity.y += dy * 0.08;
      velocity.x *= 0.82;
      velocity.y *= 0.82;
      current.x += velocity.x;
      current.y += velocity.y;

      // Base background: Soft subtle gradient matching executive theme
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#f8fafc');
      bgGrad.addColorStop(0.5, '#f1f5f9');
      bgGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Indigo / Cyan ChromaFlow Bloom behind the stripes
      const speedMagnitude = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      const bloomRadius = Math.max(220, Math.min(460, 280 + speedMagnitude * 5));

      // Cursor Bloom
      const grad = ctx.createRadialGradient(
        current.x,
        current.y,
        15,
        current.x,
        current.y,
        bloomRadius
      );
      grad.addColorStop(0, 'rgba(70, 66, 255, 0.45)');  // #4642ff Electric Indigo
      grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.32)'); // #38bdf8 Sky Cyan
      grad.addColorStop(0.7, 'rgba(127, 102, 255, 0.18)'); // #7f66ff Royal Violet
      grad.addColorStop(1, 'rgba(248, 250, 252, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(current.x, current.y, bloomRadius, 0, Math.PI * 2);
      ctx.fill();

      // Ambient counter-floating bloom for volumetric depth
      const ambientX = width * 0.3 + Math.sin(time * 0.8) * 120;
      const ambientY = height * 0.4 + Math.cos(time * 0.7) * 90;
      const ambGrad = ctx.createRadialGradient(ambientX, ambientY, 20, ambientX, ambientY, 360);
      ambGrad.addColorStop(0, 'rgba(99, 102, 241, 0.25)'); // Indigo glow
      ambGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)'); // Cyan glow
      ambGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');
      ctx.fillStyle = ambGrad;
      ctx.beginPath();
      ctx.arc(ambientX, ambientY, 360, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw Animated Fluted Glass Ribs (Diagonal 31° refraction stripes)
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((31 * Math.PI) / 180); // 31 degree diagonal angle
      const diagonalDist = Math.sqrt(width * width + height * height);

      const ribWidth = 44; // Frequency of stripes
      const numRibs = Math.ceil(diagonalDist / ribWidth) + 6;

      for (let i = -numRibs / 2; i < numRibs / 2; i++) {
        // High-speed wave distortion across the stripes
        const waveOffset = Math.sin(time * 0.8 + i * 0.22) * 6 + Math.cos(time * 0.5 + i * 0.15) * 3;
        const x = i * ribWidth + waveOffset;

        // Linear gradient highlight across each stripe for glass refraction
        const highlightGrad = ctx.createLinearGradient(x, -diagonalDist, x + ribWidth, -diagonalDist);
        highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
        highlightGrad.addColorStop(0.18, 'rgba(255, 255, 255, 0.12)');
        highlightGrad.addColorStop(0.82, 'rgba(15, 23, 42, 0.03)');
        highlightGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.32)');

        ctx.fillStyle = highlightGrad;
        ctx.fillRect(x, -diagonalDist, ribWidth, diagonalDist * 2);
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [ShaderComponents, shaderError]);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none"
    >
      {/* 1. WebGPU Shaders Pipeline (Emily Landing Page Config) */}
      {ShaderComponents && !shaderError ? (
        (() => {
          const { Shader, Swirl, ChromaFlow, FlutedGlass, FilmGrain } = ShaderComponents;
          return (
            <Shader
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                display: 'block',
              }}
              onUnavailable={() => setShaderError(true)}
            >
              <Swirl colorA="#ffffff" colorB="#f1f5f9" detail={2.0} speed={0.5} />
              <ChromaFlow
                baseColor="#ffffff"
                downColor="#4642ff"
                leftColor="#38bdf8"
                rightColor="#6366f1"
                upColor="#7f66ff"
                momentum={20}
                radius={4.2}
                intensity={1.2}
              />
              <FlutedGlass
                aberration={0.5}
                angle={31}
                frequency={9}
                highlight={0.16}
                highlightSoftness={0.1}
                lightAngle={-90}
                refraction={4}
                shape="rounded"
                softness={1}
                speed={0.4}
              />
              {FilmGrain && <FilmGrain strength={0.05} />}
            </Shader>
          );
        })()
      ) : (
        /* 2. High-Speed 60fps Diagonal Fluted Stripe Canvas */
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
        />
      )}

      {/* Subtle radial dot matrix overlay from Emily landing page */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgba(70, 66, 255, 0.08) 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Soft gradient bottom fade to ensure smooth blend into next section */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F8FAFC] to-transparent pointer-events-none" />
    </div>
  );
}
