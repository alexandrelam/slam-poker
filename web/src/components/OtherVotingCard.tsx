import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { VotingCard } from "./VotingCard";
import { cn } from "../lib/utils";
import { Check, MoreHorizontal } from "lucide-react";
import type { FibonacciCard } from "../types";

interface OtherVotingCardProps {
  isSelected?: boolean;
  isDisabled?: boolean;
  isRevealed?: boolean;
  selectedValue?: FibonacciCard;
  onClick?: (value: FibonacciCard) => void;
  className?: string;
}

// Values that are shown in the "Other" popup
const OTHER_VALUES: FibonacciCard[] = ["8", "13", "21", "34", "55", "89"];

export function OtherVotingCard({
  isSelected = false,
  isDisabled = false,
  isRevealed = false,
  selectedValue,
  onClick,
  className,
}: OtherVotingCardProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleVote = (value: FibonacciCard) => {
    if (!isDisabled && onClick) {
      onClick(value);
      setIsOpen(false);
    }
  };

  const handleCardClick = () => {
    if (!isDisabled && !isRevealed) {
      setIsOpen(true);
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

  // Check if the selected value is one of the "other" values
  const isOtherValueSelected =
    selectedValue && OTHER_VALUES.includes(selectedValue);

  // Calculate holographic gradient position based on mouse
  const gradientX = ((mousePosition.x + 1) / 2) * 100; // Convert -1,1 to 0,100
  const gradientY = ((mousePosition.y + 1) / 2) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div
          className={cn("perspective-600", {
            "relative z-50": isHovered && !isDisabled, // Bring hovered card to front
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

                // Enhanced Selected state - much more prominent
                "border-4 border-green-500 text-green-800 shadow-xl scale-110 ring-4 ring-green-200/50":
                  isSelected && isOtherValueSelected && !isRevealed,

                // Disabled state
                "cursor-not-allowed opacity-50": isDisabled,

                // Revealed state
                "bg-muted border-muted-foreground": isRevealed && !isSelected,
                "border-green-500 text-green-800":
                  isRevealed && isSelected && isOtherValueSelected,

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
              ...(isHovered &&
                !isDisabled && {
                  background: `
                    radial-gradient(circle at ${gradientX}% ${gradientY}%, 
                      hsla(${(gradientX + gradientY) * 2}deg, 100%, 85%, 0.5) 0%,
                      hsla(${(gradientX + gradientY) * 2 + 60}deg, 100%, 75%, 0.4) 25%,
                      hsla(${(gradientX + gradientY) * 2 + 120}deg, 100%, 65%, 0.3) 50%,
                      hsla(${(gradientX + gradientY) * 2 + 180}deg, 100%, 80%, 0.2) 75%,
                      transparent 90%
                    ),
                    linear-gradient(135deg, 
                      hsla(${gradientX * 3.6}deg, 100%, 85%, 0.6),
                      hsla(${gradientY * 3.6 + 180}deg, 100%, 75%, 0.4)
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
            }}
            onClick={handleCardClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            aria-selected={isSelected && isOtherValueSelected}
            role="button"
            tabIndex={isDisabled ? -1 : 0}
          >
            <div className="flex flex-col items-center gap-1">
              {isOtherValueSelected && selectedValue ? (
                <span
                  className={cn("text-3xl font-bold transition-colors", {
                    "text-green-800": isSelected,
                    "text-muted-foreground": isRevealed && !isSelected,
                    "text-foreground": !isSelected && !isRevealed,
                  })}
                >
                  {selectedValue}
                </span>
              ) : (
                <>
                  <MoreHorizontal
                    className={cn("w-6 h-6 transition-colors", {
                      "text-green-800": isSelected && isOtherValueSelected,
                      "text-muted-foreground": isRevealed && !isSelected,
                      "text-foreground": !isSelected && !isRevealed,
                    })}
                  />
                  <span
                    className={cn("text-sm font-medium transition-colors", {
                      "text-green-800": isSelected && isOtherValueSelected,
                      "text-muted-foreground": isRevealed && !isSelected,
                      "text-foreground": !isSelected && !isRevealed,
                    })}
                  >
                    Other
                  </span>
                </>
              )}
            </div>

            {/* Checkmark icon for selected state */}
            {isSelected && isOtherValueSelected && !isRevealed && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <Check className="w-4 h-4 text-white font-bold" />
              </div>
            )}

            {/* Enhanced pulse animation for selected state */}
            {isSelected && isOtherValueSelected && !isRevealed && (
              <div className="absolute inset-0 rounded-md bg-green-100/50 animate-pulse" />
            )}

            {/* Holographic overlay effect with parallax */}
            {isHovered && !isDisabled && (
              <>
                {/* Background layer - slower movement */}
                <div
                  className="absolute inset-0 rounded-md opacity-40 mix-blend-soft-light pointer-events-none"
                  style={{
                    background: `
                    conic-gradient(from ${(gradientX + gradientY) * 1.5}deg at ${50 + gradientX * 0.3}% ${50 + gradientY * 0.3}%,
                      hsl(0, 100%, 85%) 0deg,
                      hsl(60, 100%, 85%) 60deg,
                      hsl(120, 100%, 85%) 120deg,
                      hsl(180, 100%, 85%) 180deg,
                      hsl(240, 100%, 85%) 240deg,
                      hsl(300, 100%, 85%) 300deg,
                      hsl(0, 100%, 85%) 360deg
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
                    conic-gradient(from ${(gradientX + gradientY) * 3}deg at ${gradientX}% ${gradientY}%,
                      hsl(0, 100%, 75%) 0deg,
                      hsl(60, 100%, 75%) 60deg,
                      hsl(120, 100%, 75%) 120deg,
                      hsl(180, 100%, 75%) 180deg,
                      hsl(240, 100%, 75%) 240deg,
                      hsl(300, 100%, 75%) 300deg,
                      hsl(0, 100%, 75%) 360deg
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
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Your Estimate</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {OTHER_VALUES.map((value) => (
            <VotingCard
              key={value}
              value={value}
              isSelected={selectedValue === value}
              isDisabled={isDisabled}
              onClick={handleVote}
              className="w-full h-20"
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
