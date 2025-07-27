import { useEffect, useRef, useState } from "react";
import socketService from "../services/socketService";
import type { UIUser } from "../types";

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
  // User identification
  userName: string;
  userInitials: string;
  userColor: string;
  showUserIndicator: boolean;
  userIndicatorOpacity: number;
  // Animation properties
  spawnScale: number;
  spawnGlow: number;
}

interface EmojiPhysicsCanvasProps {
  className?: string;
  users?: UIUser[];
}

// User color palette for consistent user identification
const USER_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
];

// Generate user initials from name
const getUserInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Get consistent color for user based on their ID
const getUserColor = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};

export function EmojiPhysicsCanvas({
  className,
  users = [],
}: EmojiPhysicsCanvasProps) {
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

  // User indicator constants
  const USER_INDICATOR_DURATION = 3000; // Show user indicator for 3 seconds
  const USER_INDICATOR_FONT_SIZE = 14;
  const USER_INDICATOR_OFFSET_Y = -40; // Position above emoji

  // Animation constants
  const SPAWN_ANIMATION_DURATION = 500; // Spawn animation lasts 500ms
  const SPAWN_SCALE_MAX = 1.3; // Scale up to 130% during spawn

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
      // Find user information
      const user = users.find((u) => u.id === data.userId);
      const userName = user?.name || "Unknown";
      const userInitials = getUserInitials(userName);
      const userColor = getUserColor(data.userId);

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
        // User identification
        userName,
        userInitials,
        userColor,
        showUserIndicator: true,
        userIndicatorOpacity: 1.0,
        // Animation properties
        spawnScale: SPAWN_SCALE_MAX,
        spawnGlow: 1.0,
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

      // Update animations based on age
      const ageMs = currentTime - emoji.createdAt;

      // Update spawn animation (scale down to normal size)
      if (ageMs < SPAWN_ANIMATION_DURATION) {
        const progress = ageMs / SPAWN_ANIMATION_DURATION;
        // Ease out animation curve
        const easeOut = 1 - Math.pow(1 - progress, 3);
        emoji.spawnScale = SPAWN_SCALE_MAX - (SPAWN_SCALE_MAX - 1) * easeOut;
        emoji.spawnGlow = 1 - progress;
      } else {
        emoji.spawnScale = 1;
        emoji.spawnGlow = 0;
      }

      // Update user indicator opacity (fade out over time)
      if (ageMs > USER_INDICATOR_DURATION) {
        emoji.showUserIndicator = false;
        emoji.userIndicatorOpacity = 0;
      } else {
        // Fade out during the last 1/3 of the duration
        const fadeStartTime = USER_INDICATOR_DURATION * 0.67;
        if (ageMs > fadeStartTime) {
          const fadeProgress =
            (ageMs - fadeStartTime) / (USER_INDICATOR_DURATION - fadeStartTime);
          emoji.userIndicatorOpacity = Math.max(0, 1 - fadeProgress);
        }
      }

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

    // Render each emoji with user indicators
    emojisRef.current.forEach((emoji) => {
      // Render emoji with spawn animation
      ctx.save();
      ctx.translate(emoji.x, emoji.y);
      ctx.rotate(emoji.rotation);

      // Apply spawn scale animation
      ctx.scale(emoji.spawnScale, emoji.spawnScale);

      // Add spawn glow effect
      if (emoji.spawnGlow > 0) {
        ctx.shadowColor = emoji.userColor;
        ctx.shadowBlur = 20 * emoji.spawnGlow;
      }

      // Make emojis semi-transparent so they don't distract from UI
      ctx.globalAlpha = 0.7;
      ctx.fillText(emoji.emoji, 0, 0);
      ctx.restore();

      // Render user indicator if visible
      if (emoji.showUserIndicator && emoji.userIndicatorOpacity > 0) {
        ctx.save();

        // Position indicator above emoji
        const indicatorX = emoji.x;
        const indicatorY = emoji.y + USER_INDICATOR_OFFSET_Y;

        // Set up user indicator styling
        ctx.globalAlpha = emoji.userIndicatorOpacity;
        ctx.font = `bold ${USER_INDICATOR_FONT_SIZE}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Draw background circle for initials
        const bgRadius = 16;
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, bgRadius, 0, Math.PI * 2);
        ctx.fillStyle = emoji.userColor;
        ctx.fill();

        // Draw user initials
        ctx.fillStyle = "white";
        ctx.fillText(emoji.userInitials, indicatorX, indicatorY);

        // Draw user name below the circle
        ctx.font = `${USER_INDICATOR_FONT_SIZE - 2}px sans-serif`;
        ctx.fillStyle = emoji.userColor;
        ctx.fillText(emoji.userName, indicatorX, indicatorY + 24);

        ctx.restore();
      }
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
