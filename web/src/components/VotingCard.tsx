import { Card } from "./ui/card";
import { cn } from "../lib/utils";
import { Check } from "lucide-react";
import type { FibonacciCard } from "../types";

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
  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick(value);
    }
  };

  return (
    <Card
      className={cn(
        "relative flex items-center justify-center w-16 h-24 cursor-pointer transition-all duration-300 select-none",
        "hover:scale-105 hover:shadow-md active:scale-95",
        "border-2 border-border",
        {
          // Enhanced Selected state - much more prominent
          "border-4 border-green-500 bg-green-50 text-green-800 shadow-xl scale-110 ring-4 ring-green-200/50":
            isSelected && !isRevealed,

          // Disabled state
          "cursor-not-allowed opacity-50 hover:scale-100": isDisabled,

          // Revealed state
          "bg-muted border-muted-foreground": isRevealed && !isSelected,
          "bg-green-50 border-green-500 text-green-800":
            isRevealed && isSelected,

          // Default hover state (only when not disabled and not revealed)
          "hover:border-primary/50 hover:bg-accent":
            !isDisabled && !isRevealed && !isSelected,
        },
        className,
      )}
      onClick={handleClick}
      aria-selected={isSelected}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
    >
      <span
        className={cn("text-2xl font-bold transition-colors", {
          "text-green-800": isSelected,
          "text-muted-foreground": isRevealed && !isSelected,
          "text-foreground": !isSelected && !isRevealed,
        })}
      >
        {value === "?" ? "?" : value}
      </span>

      {/* Checkmark icon for selected state */}
      {isSelected && !isRevealed && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
          <Check className="w-4 h-4 text-white font-bold" />
        </div>
      )}

      {/* Enhanced pulse animation for selected state */}
      {isSelected && !isRevealed && (
        <div className="absolute inset-0 rounded-md bg-green-100/50 animate-pulse" />
      )}
    </Card>
  );
}
