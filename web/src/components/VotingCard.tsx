import { Card } from "./ui/card";
import { cn } from "../lib/utils";
import { Check } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import type { FibonacciCard } from "../types";

// Color mapping function to assign unique hue ranges to each card
function getCardHue(value: FibonacciCard): number {
  const hueMap: Record<FibonacciCard, number> = {
    "1": 0, // Red/Pink
    "2": 60, // Orange/Yellow
    "3": 120, // Green
    "5": 180, // Blue/Cyan
    "8": 200, // Deep Blue
    "13": 220, // Blue-Purple
    "21": 240, // Purple
    "34": 260, // Purple-Magenta
    "55": 280, // Magenta
    "89": 290, // Magenta-Pink
    "?": 300, // Violet/Pink
  };
  return hueMap[value] || 0;
}

interface VotingCardProps {
  value: FibonacciCard;
  isSelected?: boolean;
  isDisabled?: boolean;
  isRevealed?: boolean;
  onClick?: (value: FibonacciCard) => void;
  className?: string;
}

export function VotingCard({
  value,
  isSelected = false,
  isDisabled = false,
  isRevealed = false,
  onClick,
  className,
}: VotingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [transforms, setTransforms] = useState({
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    scale: 1,
    translateZ: 0,
  });
  // Subtle floating animation when not hovered
  useEffect(() => {
    if (isHovered || isDisabled) return;

    const floatInterval = setInterval(() => {
      // Double-check state to prevent conflicts
      if (!isHovered && !isDisabled) {
        setTransforms({
          rotateX: Math.sin(Date.now() * 0.001) * 2,
          rotateY: Math.cos(Date.now() * 0.0015) * 2,
          rotateZ: Math.sin(Date.now() * 0.0008) * 1,
          translateZ: Math.sin(Date.now() * 0.002) * 3 + 3,
          scale: 1, // Always keep scale at 1 for floating animation
        });
      }
    }, 50);

    return () => clearInterval(floatInterval);
  }, [isHovered, isDisabled]);

  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick(value);
    }
  };

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setMousePosition({ x: 0, y: 0 });

    // Immediately reset scale to prevent cards staying enlarged
    setTransforms({
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      translateZ: 0,
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current || isDisabled) return;

      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;

      // Normalize to -1 to 1 range
      const normalizedX = mouseX / (rect.width / 2);
      const normalizedY = mouseY / (rect.height / 2);

      // Calculate dramatic 3D rotation for enhanced visibility
      const rotateY = normalizedX * 30; // max 30 degrees for dramatic effect
      const rotateX = -normalizedY * 30; // negative for natural feel
      const rotateZ = (normalizedX + normalizedY) * 5; // subtle Z rotation for complexity

      setMousePosition({ x: normalizedX, y: normalizedY });
      setTransforms({
        rotateX,
        rotateY,
        rotateZ,
        scale: 1.25, // Moderate scale increase for better proportions
        translateZ: 50, // Lift card off surface
      });
    },
    [isDisabled],
  );

  // Calculate holographic gradient position based on mouse
  const gradientX = ((mousePosition.x + 1) / 2) * 100; // Convert -1,1 to 0,100
  const gradientY = ((mousePosition.y + 1) / 2) * 100;

  // Get card-specific base hue offset for rainbow rotation
  const baseHue = getCardHue(value);
  const mouseHueShift = (gradientX + gradientY) * 0.5; // Mouse adds variation across spectrum

  return (
    <div
      className={cn("perspective-600", {
        "relative z-50": isHovered && !isDisabled, // Bring hovered card to front
        "relative z-40": isSelected && !isRevealed, // Selected cards above others
      })}
      style={{ perspective: "600px" }}
    >
      <Card
        ref={cardRef}
        className={cn(
          "relative flex items-center justify-center w-24 h-32 cursor-pointer select-none",
          "transform-gpu preserve-3d border-2 border-border overflow-hidden",
          {
            // Transition timing
            "transition-all duration-100 ease-out": isHovered,
            "transition-all duration-500 ease-out": !isHovered,

            // Rainbow selected state with breezing effect
            "card-selected-rainbow shadow-xl": isSelected && !isRevealed,

            // Disabled state
            "cursor-not-allowed opacity-50": isDisabled,

            // Revealed state
            "bg-muted border-muted-foreground": isRevealed && !isSelected,
            "card-selected-rainbow": isRevealed && isSelected,

            // Holographic hover effect
            "holographic-card": isHovered && !isDisabled,
          },
          className,
        )}
        style={{
          transform: isDisabled
            ? "none"
            : `rotateX(${transforms.rotateX}deg) rotateY(${transforms.rotateY}deg) rotateZ(${transforms.rotateZ}deg) translateZ(${transforms.translateZ}px) scale(${transforms.scale})`,
          transformStyle: "preserve-3d",
          // Holographic effects for hovered cards
          ...(isHovered &&
            !isDisabled && {
              background: `
                radial-gradient(circle at ${gradientX}% ${gradientY}%, 
                  hsla(${baseHue + mouseHueShift}deg, 100%, 85%, 0.5) 0%,
                  hsla(${baseHue + mouseHueShift + 60}deg, 100%, 80%, 0.4) 25%,
                  hsla(${baseHue + mouseHueShift + 120}deg, 95%, 70%, 0.3) 50%,
                  hsla(${baseHue + mouseHueShift + 180}deg, 90%, 75%, 0.2) 75%,
                  transparent 90%
                ),
                linear-gradient(135deg, 
                  hsla(${baseHue + 45}deg, 100%, 85%, 0.6),
                  hsla(${baseHue + 225}deg, 95%, 75%, 0.4)
                )
              `,
              backdropFilter: "blur(0.8px) saturate(1.5)",
              boxShadow: `
                ${transforms.rotateY * 1.5}px ${transforms.rotateX * 1.5}px 40px rgba(255, 255, 255, 0.15),
                ${transforms.rotateY * 0.8}px ${transforms.rotateX * 0.8}px 20px rgba(255, 255, 255, 0.1),
                0 0 60px rgba(${Math.abs(transforms.rotateY) * 6 + 100}, ${Math.abs(transforms.rotateX) * 6 + 150}, 255, 0.4),
                0 0 30px rgba(255, 255, 255, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.5),
                inset 0 -1px 0 rgba(255, 255, 255, 0.1)
              `,
            }),
          // Subtle rainbow holographic effects for selected cards (reduced opacity for readability)
          ...(isSelected &&
            !isRevealed && {
              background: `
                radial-gradient(circle at 50% 50%, 
                  hsla(${baseHue}deg, 100%, 85%, 0.25) 0%,
                  hsla(${baseHue + 60}deg, 100%, 80%, 0.2) 25%,
                  hsla(${baseHue + 120}deg, 95%, 75%, 0.15) 50%,
                  hsla(${baseHue + 180}deg, 90%, 80%, 0.1) 75%,
                  transparent 90%
                ),
                linear-gradient(135deg, 
                  hsla(${baseHue + 30}deg, 100%, 85%, 0.3),
                  hsla(${baseHue + 210}deg, 95%, 75%, 0.2)
                )
              `,
              backdropFilter: "blur(0.5px) saturate(1.3)",
              border: `4px solid transparent`,
              backgroundImage: `
                radial-gradient(circle at 50% 50%, 
                  hsla(${baseHue}deg, 100%, 85%, 0.25) 0%,
                  hsla(${baseHue + 60}deg, 100%, 80%, 0.2) 25%,
                  hsla(${baseHue + 120}deg, 95%, 75%, 0.15) 50%,
                  hsla(${baseHue + 180}deg, 90%, 80%, 0.1) 75%,
                  transparent 90%
                ),
                linear-gradient(135deg, 
                  hsla(${baseHue + 30}deg, 100%, 85%, 0.3),
                  hsla(${baseHue + 210}deg, 95%, 75%, 0.2)
                ),
                linear-gradient(45deg, 
                  hsl(${baseHue}deg, 100%, 60%), 
                  hsl(${baseHue + 60}deg, 100%, 60%)
                )
              `,
              backgroundOrigin: "border-box",
              backgroundClip: "content-box, content-box, border-box",
              boxShadow: `
                0 0 40px hsla(${baseHue}deg, 100%, 70%, 0.3),
                0 0 80px hsla(${baseHue + 120}deg, 100%, 70%, 0.2),
                0 8px 32px rgba(255, 255, 255, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.4),
                inset 0 -1px 0 rgba(255, 255, 255, 0.1),
                0 0 20px hsla(${baseHue}deg, 100%, 60%, 0.6)
              `,
            }),
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        aria-selected={isSelected}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
      >
        <div className="relative flex items-center justify-center">
          {/* Text backdrop for selected state */}
          {isSelected && !isRevealed && (
            <div
              className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full opacity-80 backdrop-blur-sm"
              style={{
                background: `radial-gradient(circle, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 70%, transparent 100%)`,
                transform: "translate(-50%, -50%)",
              }}
            />
          )}

          <span
            className={cn(
              "text-3xl font-bold transition-all duration-300 relative z-20",
              {
                "text-white font-extrabold": isSelected && !isRevealed,
                "text-muted-foreground": isRevealed && !isSelected,
                "text-foreground": !isSelected && !isRevealed,
              },
            )}
            style={{
              ...(isSelected &&
                !isRevealed && {
                  textShadow: `
                  0 2px 4px rgba(0, 0, 0, 0.8),
                  0 0 8px rgba(0, 0, 0, 0.6),
                  0 0 16px hsla(${baseHue}deg, 100%, 50%, 0.4)
                `,
                }),
            }}
          >
            {value === "?" ? "?" : value}
          </span>
        </div>

        {/* Rainbow checkmark icon for selected state */}
        {isSelected && !isRevealed && (
          <div
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg animate-bounce"
            style={{
              background: `linear-gradient(45deg, hsl(${baseHue}deg, 100%, 60%), hsl(${baseHue + 60}deg, 100%, 60%))`,
              boxShadow: `0 0 20px hsla(${baseHue}deg, 100%, 60%, 0.6)`,
            }}
          >
            <Check className="w-4 h-4 text-white font-bold" />
          </div>
        )}

        {/* Rainbow breezing overlay for selected state (reduced opacity for readability) */}
        {isSelected && !isRevealed && (
          <div
            className="absolute inset-0 rounded-md opacity-15 pointer-events-none"
            style={{
              background: `
                conic-gradient(from 0deg at 50% 50%,
                  hsl(${baseHue + 0}, 100%, 80%) 0deg,
                  hsl(${baseHue + 60}, 100%, 80%) 60deg,
                  hsl(${baseHue + 120}, 100%, 80%) 120deg,
                  hsl(${baseHue + 180}, 100%, 80%) 180deg,
                  hsl(${baseHue + 240}, 100%, 80%) 240deg,
                  hsl(${baseHue + 300}, 100%, 80%) 300deg,
                  hsl(${baseHue + 360}, 100%, 80%) 360deg
                )
              `,
              animation: "rainbow-flow 4s ease-in-out infinite",
            }}
          />
        )}

        {/* Holographic overlay effect with parallax */}
        {isHovered && !isDisabled && (
          <>
            {/* Background layer - slower movement */}
            <div
              className="absolute inset-0 rounded-md opacity-40 mix-blend-soft-light pointer-events-none"
              style={{
                background: `
                conic-gradient(from ${(gradientX + gradientY) * 1.5 + baseHue}deg at ${50 + gradientX * 0.3}% ${50 + gradientY * 0.3}%,
                  hsl(${baseHue + 0}, 100%, 85%) 0deg,
                  hsl(${baseHue + 60}, 100%, 85%) 60deg,
                  hsl(${baseHue + 120}, 100%, 85%) 120deg,
                  hsl(${baseHue + 180}, 100%, 85%) 180deg,
                  hsl(${baseHue + 240}, 100%, 85%) 240deg,
                  hsl(${baseHue + 300}, 100%, 85%) 300deg,
                  hsl(${baseHue + 360}, 100%, 85%) 360deg
                )
              `,
                transform: `translateX(${transforms.rotateY * 0.3}px) translateY(${transforms.rotateX * 0.3}px)`,
              }}
            />

            {/* Foreground layer - faster movement */}
            <div
              className="absolute inset-0 rounded-md opacity-70 mix-blend-overlay pointer-events-none"
              style={{
                background: `
                conic-gradient(from ${(gradientX + gradientY) * 3 + baseHue}deg at ${gradientX}% ${gradientY}%,
                  hsl(${baseHue + 0}, 100%, 75%) 0deg,
                  hsl(${baseHue + 60}, 100%, 75%) 60deg,
                  hsl(${baseHue + 120}, 100%, 75%) 120deg,
                  hsl(${baseHue + 180}, 100%, 75%) 180deg,
                  hsl(${baseHue + 240}, 100%, 75%) 240deg,
                  hsl(${baseHue + 300}, 100%, 75%) 300deg,
                  hsl(${baseHue + 360}, 100%, 75%) 360deg
                )
              `,
                transform: `translateX(${transforms.rotateY * 0.8}px) translateY(${transforms.rotateX * 0.8}px)`,
              }}
            />

            {/* Shine effect that follows mouse */}
            <div
              className="absolute inset-0 rounded-md opacity-30 mix-blend-plus-lighter pointer-events-none"
              style={{
                background: `
                radial-gradient(circle at ${gradientX}% ${gradientY}%, 
                  rgba(255, 255, 255, 0.8) 0%,
                  rgba(255, 255, 255, 0.4) 20%,
                  transparent 60%
                )
              `,
                transform: `translateX(${transforms.rotateY * 1.2}px) translateY(${transforms.rotateX * 1.2}px)`,
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
