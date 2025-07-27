import { useRef, useEffect, useState } from "react";
import { NoiseGenerator } from "../lib/noiseUtils";

interface BackgroundCanvasProps {
  className?: string;
  isDark?: boolean;
}

// Performance monitoring
class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;

  update() {
    this.frameCount++;
    const currentTime = performance.now();

    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round(
        (this.frameCount * 1000) / (currentTime - this.lastTime),
      );
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    return this.fps;
  }

  getFPS() {
    return this.fps;
  }
}

export function BackgroundCanvas({
  className = "",
  isDark = false,
}: BackgroundCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Off-screen canvases for pre-rendered textures
  const backgroundTextureRef = useRef<HTMLCanvasElement | null>(null);
  const noiseTextureRef = useRef<HTMLCanvasElement | null>(null);

  // Performance monitoring
  const performanceMonitor = useRef(new PerformanceMonitor());
  const [quality, setQuality] = useState<"high" | "medium" | "low">("high");

  // Reduced particle system
  const particlesRef = useRef<
    {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
    }[]
  >([]);

  const startTimeRef = useRef<number>(Date.now());
  const lastFrameTimeRef = useRef<number>(0);
  const noiseRef = useRef<NoiseGenerator | null>(null);

  // Device capability detection
  const getDeviceQuality = (): "high" | "medium" | "low" => {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    const hasLowMemory =
      "deviceMemory" in navigator &&
      (navigator as { deviceMemory?: number }).deviceMemory &&
      (navigator as { deviceMemory: number }).deviceMemory < 4;

    if (!gl || isMobile || hasLowMemory) return "low";
    return window.innerWidth > 1920 ? "high" : "medium";
  };

  // Pre-render static background texture
  const createBackgroundTexture = (width: number, height: number) => {
    const canvas = document.createElement("canvas");
    const scale = quality === "low" ? 0.5 : quality === "medium" ? 0.75 : 1;

    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    // Create gradient base
    const gradient = ctx.createRadialGradient(
      canvas.width * 0.3,
      canvas.height * 0.3,
      0,
      canvas.width * 0.7,
      canvas.height * 0.7,
      Math.max(canvas.width, canvas.height) * 0.8,
    );

    if (isDark) {
      gradient.addColorStop(0, "rgba(147, 51, 234, 0.08)");
      gradient.addColorStop(0.3, "rgba(236, 72, 153, 0.06)");
      gradient.addColorStop(0.6, "rgba(59, 130, 246, 0.04)");
      gradient.addColorStop(1, "rgba(16, 185, 129, 0.02)");
    } else {
      gradient.addColorStop(0, "rgba(147, 51, 234, 0.03)");
      gradient.addColorStop(0.3, "rgba(236, 72, 153, 0.025)");
      gradient.addColorStop(0.6, "rgba(59, 130, 246, 0.02)");
      gradient.addColorStop(1, "rgba(16, 185, 129, 0.015)");
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add marbling effect with fewer, larger swirls
    const swirls = quality === "low" ? 2 : quality === "medium" ? 3 : 4;
    for (let i = 0; i < swirls; i++) {
      const centerX = (0.2 + i * 0.3) * canvas.width;
      const centerY = (0.3 + Math.sin(i) * 0.2) * canvas.height;
      const radius = Math.min(canvas.width, canvas.height) * (0.3 + i * 0.1);

      const swirlGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius,
      );

      if (isDark) {
        swirlGradient.addColorStop(
          0,
          `rgba(${147 + i * 20}, ${51 + i * 10}, 234, 0.06)`,
        );
        swirlGradient.addColorStop(
          0.5,
          `rgba(${236 - i * 20}, ${72 + i * 15}, 153, 0.04)`,
        );
      } else {
        swirlGradient.addColorStop(
          0,
          `rgba(${147 + i * 20}, ${51 + i * 10}, 234, 0.025)`,
        );
        swirlGradient.addColorStop(
          0.5,
          `rgba(${236 - i * 20}, ${72 + i * 15}, 153, 0.02)`,
        );
      }
      swirlGradient.addColorStop(1, "transparent");

      ctx.fillStyle = swirlGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  };

  // Pre-render noise texture (much simpler)
  const createNoiseTexture = (width: number, height: number) => {
    const canvas = document.createElement("canvas");
    const scale = quality === "low" ? 0.25 : quality === "medium" ? 0.5 : 0.75;

    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx || !noiseRef.current) return canvas;

    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    const step = quality === "low" ? 8 : quality === "medium" ? 4 : 2;

    for (let x = 0; x < canvas.width; x += step) {
      for (let y = 0; y < canvas.height; y += step) {
        const noiseValue = noiseRef.current.octaveNoise(
          x * 0.01,
          y * 0.01,
          3,
          0.5,
          1,
        );
        const brightness = Math.floor((noiseValue + 1) * 127.5);

        if (brightness > 120) {
          const alpha = isDark ? brightness * 0.1 : brightness * 0.05;

          for (let dx = 0; dx < step && x + dx < canvas.width; dx++) {
            for (let dy = 0; dy < step && y + dy < canvas.height; dy++) {
              const index = ((y + dy) * canvas.width + (x + dx)) * 4;
              data[index] = brightness;
              data[index + 1] = brightness;
              data[index + 2] = brightness;
              data[index + 3] = alpha;
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  // Initialize particles (much fewer)
  const initParticles = () => {
    const count = quality === "low" ? 25 : quality === "medium" ? 50 : 75;
    const particles = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: Math.random() * 300 + 200,
        maxLife: Math.random() * 300 + 200,
        size: Math.random() * 2 + 1,
      });
    }

    return particles;
  };

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // Initialize systems
    noiseRef.current = new NoiseGenerator(12345);

    // Create pre-rendered textures
    backgroundTextureRef.current = createBackgroundTexture(
      rect.width,
      rect.height,
    );
    noiseTextureRef.current = createNoiseTexture(rect.width, rect.height);

    // Initialize particles
    particlesRef.current = initParticles();

    startTimeRef.current = Date.now();
    setIsInitialized(true);
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    const particles = particlesRef.current;
    if (particles.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // Batch particle rendering
    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife;
      if (alpha < 0.1) continue; // Skip nearly invisible particles

      ctx.globalAlpha = alpha * (isDark ? 0.4 : 0.2);
      ctx.fillStyle = isDark
        ? "rgba(147, 51, 234, 1)"
        : "rgba(147, 51, 234, 0.8)";

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  const updateParticles = () => {
    const particles = particlesRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];

      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life--;

      // Reset particle if it dies or goes out of bounds
      if (
        particle.life <= 0 ||
        particle.x < -10 ||
        particle.x > rect.width + 10 ||
        particle.y < -10 ||
        particle.y > rect.height + 10
      ) {
        particle.x = Math.random() * rect.width;
        particle.y = Math.random() * rect.height;
        particle.vx = (Math.random() - 0.5) * 0.5;
        particle.vy = (Math.random() - 0.5) * 0.5;
        particle.life = particle.maxLife;
      }
    }
  };

  const animate = (currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !isInitialized) return;

    // Check accessibility preferences
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const reducedData = window.matchMedia(
      "(prefers-reduced-data: reduce)",
    ).matches;

    // Dynamic frame rate based on performance
    const fps = performanceMonitor.current.update();
    const targetFrameTime = fps < 30 ? 33.33 : 16.67; // Adaptive frame rate

    if (currentTime - lastFrameTimeRef.current < targetFrameTime) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameTimeRef.current = currentTime;

    // Adaptive quality based on performance
    if (fps < 20 && quality !== "low") {
      setQuality("low");
      setTimeout(() => setIsInitialized(false), 100); // Reinitialize with lower quality
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw pre-rendered background
    if (backgroundTextureRef.current) {
      ctx.drawImage(
        backgroundTextureRef.current,
        0,
        0,
        rect.width,
        rect.height,
      );
    }

    // Animated elements only if not reduced motion
    if (!reducedMotion && !reducedData && quality !== "low") {
      // Draw pre-rendered noise with slight animation
      if (noiseTextureRef.current) {
        const time = (Date.now() - startTimeRef.current) * 0.00005;
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.translate(Math.sin(time) * 2, Math.cos(time) * 2);
        ctx.drawImage(noiseTextureRef.current, 0, 0, rect.width, rect.height);
        ctx.restore();
      }

      // Update and draw particles (much less frequently)
      if (Math.floor(currentTime / 100) % 3 === 0) {
        updateParticles();
      }
      drawParticles(ctx);
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    // Set quality based on device capabilities
    setQuality(getDeviceQuality());

    const handleResize = () => {
      setIsInitialized(false);
      setTimeout(() => {
        initializeCanvas();
      }, 150);
    };

    initializeCanvas();
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDark, quality]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isInitialized) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isInitialized, isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enhanced accessibility checks
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const prefersHighContrast = window.matchMedia(
    "(prefers-contrast: high)",
  ).matches;
  const prefersReducedData = window.matchMedia(
    "(prefers-reduced-data: reduce)",
  ).matches;

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-none z-0 ${className}`}
      style={{
        opacity:
          prefersReducedMotion || prefersReducedData
            ? 0.1
            : prefersHighContrast
              ? 0.2
              : quality === "low"
                ? 0.6
                : 1,
        transition: "opacity 0.3s ease-in-out",
        willChange: prefersReducedMotion ? "auto" : "transform",
        transform: prefersReducedMotion ? "none" : "translateZ(0)",
      }}
      role="presentation"
      aria-hidden="true"
      aria-label="Decorative background with procedural noise and marbling patterns"
    />
  );
}
