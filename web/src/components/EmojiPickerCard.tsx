import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
} from "./ui/emoji-picker";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Smile, EyeOff, X } from "lucide-react";
import { useUserPreferences } from "../context/UserPreferencesContext";

interface EmojiPickerCardProps {
  onEmojiSelect?: (emoji: string) => void;
}

export function EmojiPickerCard({ onEmojiSelect }: EmojiPickerCardProps) {
  const { emojiEnabled, toggleEmoji } = useUserPreferences();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <Smile className="w-5 h-5" />
              Emoji Reactions
            </CardTitle>
            {!emojiEnabled && (
              <Badge variant="secondary" className="text-xs">
                Disabled
              </Badge>
            )}
          </div>
          <Button
            variant={emojiEnabled ? "ghost" : "outline"}
            size="sm"
            onClick={toggleEmoji}
            className={`gap-1.5 px-2 flex-shrink-0 ${!emojiEnabled ? "text-muted-foreground border-dashed" : ""}`}
            title={
              emojiEnabled
                ? "Disable emoji reactions"
                : "Enable emoji reactions"
            }
          >
            {emojiEnabled ? (
              <>
                <X className="w-3 h-3" />
                <span className="text-xs">Disable</span>
              </>
            ) : (
              <>
                <Smile className="w-3 h-3" />
                <span className="text-xs">Enable</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {emojiEnabled ? (
          <EmojiPicker
            className="w-fit max-w-none border rounded-md overflow-hidden"
            onEmojiSelect={
              onEmojiSelect ? (emoji) => onEmojiSelect(emoji.emoji) : undefined
            }
          >
            <EmojiPickerSearch placeholder="Search emojis..." />
            <EmojiPickerContent className="max-h-40 overflow-y-auto" />
          </EmojiPicker>
        ) : (
          <div className="flex items-center justify-center py-8 text-center">
            <div className="text-muted-foreground">
              <EyeOff className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium mb-1">
                Emoji reactions are disabled
              </p>
              <p className="text-xs">
                Click "Enable" above to see and send emoji reactions
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
