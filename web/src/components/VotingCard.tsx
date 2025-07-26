import { Card } from "./ui/card";
import { cn } from "../lib/utils";
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
        "relative flex items-center justify-center w-16 h-24 cursor-pointer transition-all duration-200 select-none",
        "hover:scale-105 hover:shadow-md active:scale-95",
        "border-2 border-border",
        {
          // Selected state
          "border-primary bg-primary text-primary-foreground shadow-lg scale-105":
            isSelected && !isRevealed,

          // Disabled state
          "cursor-not-allowed opacity-50 hover:scale-100": isDisabled,

          // Revealed state
          "bg-muted border-muted-foreground": isRevealed && !isSelected,
          "bg-primary/20 border-primary": isRevealed && isSelected,

          // Default hover state (only when not disabled and not revealed)
          "hover:border-primary/50 hover:bg-accent":
            !isDisabled && !isRevealed && !isSelected,
        },
        className,
      )}
      onClick={handleClick}
    >
      <span
        className={cn("text-2xl font-bold transition-colors", {
          "text-primary-foreground": isSelected && !isRevealed,
          "text-muted-foreground": isRevealed && !isSelected,
          "text-primary": isRevealed && isSelected,
          "text-foreground": !isSelected && !isRevealed,
        })}
      >
        {value === "?" ? "?" : value}
      </span>

      {/* Optional: Add a subtle animation when selected */}
      {isSelected && !isRevealed && (
        <div className="absolute inset-0 rounded-md bg-primary/10 animate-pulse" />
      )}
    </Card>
  );
}
