import { useState } from "react";
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

  // Check if the selected value is one of the "other" values
  const isOtherValueSelected =
    selectedValue && OTHER_VALUES.includes(selectedValue);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card
          className={cn(
            "relative flex items-center justify-center w-24 h-32 cursor-pointer transition-all duration-300 select-none",
            "hover:scale-105 hover:shadow-md active:scale-95",
            "border-2 border-border",
            {
              // Enhanced Selected state - much more prominent
              "border-4 border-green-500 bg-green-50 text-green-800 shadow-xl scale-110 ring-4 ring-green-200/50":
                isSelected && isOtherValueSelected && !isRevealed,

              // Disabled state
              "cursor-not-allowed opacity-50 hover:scale-100": isDisabled,

              // Revealed state
              "bg-muted border-muted-foreground": isRevealed && !isSelected,
              "bg-green-50 border-green-500 text-green-800":
                isRevealed && isSelected && isOtherValueSelected,

              // Default hover state (only when not disabled and not revealed)
              "hover:border-primary/50 hover:bg-accent":
                !isDisabled && !isRevealed && !isSelected,
            },
            className,
          )}
          onClick={handleCardClick}
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
        </Card>
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
