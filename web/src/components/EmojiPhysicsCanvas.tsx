import { useEffect, useRef, useState } from "react";
import socketService from "../services/socketService";

interface EmojiEntity {
  id: string;
  emoji: string;
  x: number;
  y: number;
  vx: number; // velocity x
  vy: number; // velocity y
  radius: number;
  rotation: number;
  rotationSpeed: number;
  userId: string;
  createdAt: number;
}

interface EmojiPhysicsCanvasProps {
  className?: string;
}

export function EmojiPhysicsCanvas({ className }: EmojiPhysicsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const emojisRef = useRef<EmojiEntity[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Physics constants
  const GRAVITY = 0.5;
  const FRICTION = 0.98;
  const BOUNCE_DAMPING = 0.7;
  const MIN_VELOCITY = 0.1;
  const EMOJI_SIZE = 56; // Base emoji size in pixels
  const CLEANUP_TIME = 30000; // Remove emojis after 30 seconds

  // Initialize canvas size
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Use viewport dimensions directly
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      // Set actual canvas size
      canvas.width = viewportWidth * dpr;
      canvas.height = viewportHeight * dpr;

      // Set canvas style size (already handled by CSS, but ensure consistency)
      canvas.style.width = viewportWidth + "px";
      canvas.style.height = viewportHeight + "px";

      // Scale context for high DPI displays
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      setCanvasSize({ width: viewportWidth, height: viewportHeight });
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Listen for emoji spawn events
  useEffect(() => {
    const handleEmojiSpawned = (data: {
      emoji: string;
      x: number;
      y: number;
      userId: string;
    }) => {
      const newEmoji: EmojiEntity = {
        id: `${Date.now()}-${Math.random()}`,
        emoji: data.emoji,
        x: (data.x / 100) * canvasSize.width, // Convert percentage to pixels
        y: data.y,
        vx: (Math.random() - 0.5) * 2, // Random horizontal velocity
        vy: 0,
        radius: EMOJI_SIZE / 2,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        userId: data.userId,
        createdAt: Date.now(),
      };

      emojisRef.current.push(newEmoji);
    };

    socketService.on("emoji-spawned", handleEmojiSpawned);

    return () => {
      socketService.off("emoji-spawned");
    };
  }, [canvasSize]);

  // Physics simulation
  const updatePhysics = () => {
    const emojis = emojisRef.current;
    const currentTime = Date.now();

    // Remove old emojis
    emojisRef.current = emojis.filter(
      (emoji) => currentTime - emoji.createdAt < CLEANUP_TIME,
    );

    emojisRef.current.forEach((emoji, index) => {
      // Apply gravity
      emoji.vy += GRAVITY;

      // Apply velocity
      emoji.x += emoji.vx;
      emoji.y += emoji.vy;

      // Apply friction to horizontal movement
      emoji.vx *= FRICTION;

      // Update rotation
      emoji.rotation += emoji.rotationSpeed;

      // Boundary collisions
      // Left wall
      if (emoji.x - emoji.radius < 0) {
        emoji.x = emoji.radius;
        emoji.vx = -emoji.vx * BOUNCE_DAMPING;
      }
      // Right wall
      else if (emoji.x + emoji.radius > canvasSize.width) {
        emoji.x = canvasSize.width - emoji.radius;
        emoji.vx = -emoji.vx * BOUNCE_DAMPING;
      }

      // Ground collision
      if (emoji.y + emoji.radius > canvasSize.height) {
        emoji.y = canvasSize.height - emoji.radius;
        emoji.vy = -emoji.vy * BOUNCE_DAMPING;

        // Stop very small bounces
        if (Math.abs(emoji.vy) < MIN_VELOCITY) {
          emoji.vy = 0;
        }

        // Reduce horizontal movement when hitting ground
        emoji.vx *= 0.8;
      }

      // Emoji-to-emoji collision detection
      for (let j = index + 1; j < emojisRef.current.length; j++) {
        const other = emojisRef.current[j];
        const dx = other.x - emoji.x;
        const dy = other.y - emoji.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = emoji.radius + other.radius;

        if (distance < minDistance) {
          // Resolve collision
          const overlap = minDistance - distance;
          const separationX = (dx / distance) * overlap * 0.5;
          const separationY = (dy / distance) * overlap * 0.5;

          // Separate emojis
          emoji.x -= separationX;
          emoji.y -= separationY;
          other.x += separationX;
          other.y += separationY;

          // Calculate collision response
          const normalX = dx / distance;
          const normalY = dy / distance;

          // Relative velocity
          const relativeVelX = other.vx - emoji.vx;
          const relativeVelY = other.vy - emoji.vy;

          // Velocity in collision normal direction
          const velocityInNormal =
            relativeVelX * normalX + relativeVelY * normalY;

          // Only resolve if objects are moving towards each other
          if (velocityInNormal > 0) {
            const impulse = (2 * velocityInNormal) / 2; // Assuming equal mass

            emoji.vx += impulse * normalX * BOUNCE_DAMPING;
            emoji.vy += impulse * normalY * BOUNCE_DAMPING;
            other.vx -= impulse * normalX * BOUNCE_DAMPING;
            other.vy -= impulse * normalY * BOUNCE_DAMPING;
          }
        }
      }
    });
  };

  // Render emojis
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Set emoji rendering properties
    ctx.font = `${EMOJI_SIZE}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Render each emoji with subtle opacity
    emojisRef.current.forEach((emoji) => {
      ctx.save();
      ctx.translate(emoji.x, emoji.y);
      ctx.rotate(emoji.rotation);
      // Make emojis semi-transparent so they don't distract from UI
      ctx.globalAlpha = 0.7;
      ctx.fillText(emoji.emoji, 0, 0);
      ctx.restore();
    });
  };

  // Start animation loop
  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      // Animation loop
      const animate = () => {
        updatePhysics();
        render();
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [canvasSize]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className || ""}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
      }}
    />
  );
}
