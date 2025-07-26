import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Edit2, Check, X, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface NameEditorProps {
  currentName: string;
  onChangeName: (newName: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function NameEditor({
  currentName,
  onChangeName,
  isLoading = false,
  className,
}: NameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [wasLoading, setWasLoading] = useState(false);

  // Exit edit mode when loading transitions from true to false (operation completed)
  useEffect(() => {
    if (wasLoading && !isLoading) {
      // Loading just finished, exit edit mode and sync with current name
      setIsEditing(false);
      setNewName(currentName);
    }
    setWasLoading(isLoading);
  }, [isLoading, wasLoading, currentName]);

  const handleStartEdit = () => {
    setNewName(currentName);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setNewName(currentName);
    setError(null);
    setIsEditing(false);
  };

  const handleSave = () => {
    const trimmedName = newName.trim();

    // Validate name
    if (!trimmedName) {
      setError("Name cannot be empty");
      return;
    }

    if (trimmedName.length > 50) {
      setError("Name must be 50 characters or less");
      return;
    }

    if (trimmedName === currentName) {
      setIsEditing(false);
      return;
    }

    // Call the name change function, but don't exit edit mode yet
    // The component will exit edit mode when the loading state clears
    onChangeName(trimmedName);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1">
          <Input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter name"
            className={cn(
              "h-8 text-sm",
              error && "border-red-500 focus-visible:ring-red-500",
            )}
            autoFocus
            disabled={isLoading}
            maxLength={50}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isLoading || !newName.trim()}
            className="h-8 w-8 p-0"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-medium truncate">{currentName}</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleStartEdit}
        disabled={isLoading}
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Edit name"
      >
        <Edit2 className="w-3 h-3" />
      </Button>
    </div>
  );
}
