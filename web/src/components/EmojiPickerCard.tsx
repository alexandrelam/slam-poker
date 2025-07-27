import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
} from "./ui/emoji-picker";
import { Smile } from "lucide-react";

export function EmojiPickerCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smile className="w-5 h-5" />
          Select Emoji
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EmojiPicker className="w-fit max-w-none border rounded-md overflow-hidden">
          <EmojiPickerSearch placeholder="Search emojis..." />
          <EmojiPickerContent className="max-h-40 overflow-y-auto" />
        </EmojiPicker>
      </CardContent>
    </Card>
  );
}
