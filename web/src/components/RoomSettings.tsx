import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Settings, Users, Crown } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { RevealPermission, KickPermission } from "../types";

interface RoomSettingsProps {
  className?: string;
}

export function RoomSettings({ className }: RoomSettingsProps) {
  const { state, actions } = useApp();
  const room = actions.getCurrentRoom();
  const isUserFacilitator = actions.isUserFacilitator();

  if (!room || !state.currentUser || !isUserFacilitator) {
    return null;
  }

  const handleRevealPermissionChange = (permission: RevealPermission) => {
    if (permission !== room.revealPermission) {
      actions.updateRoomSettings({ revealPermission: permission });
    }
  };

  const handleKickPermissionChange = (permission: KickPermission) => {
    if (permission !== room.kickPermission) {
      actions.updateRoomSettings({ kickPermission: permission });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Room Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-3">
            Who can reveal votes and start next round?
          </h4>
          <div className="space-y-2">
            {/* Host Only Option */}
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="revealPermission"
                value="host-only"
                checked={room.revealPermission === "host-only"}
                onChange={() => handleRevealPermissionChange("host-only")}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Host only</span>
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Only the room host can reveal votes and start the next round
                </p>
              </div>
            </label>

            {/* Everyone Option */}
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="revealPermission"
                value="everyone"
                checked={room.revealPermission === "everyone"}
                onChange={() => handleRevealPermissionChange("everyone")}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Everyone</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Any participant can reveal votes and start the next round
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Kick Permission Setting */}
        <div>
          <h4 className="text-sm font-medium mb-3">
            Who can kick disconnected users?
          </h4>
          <div className="space-y-2">
            {/* Host Only Option */}
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="kickPermission"
                value="host-only"
                checked={room.kickPermission === "host-only"}
                onChange={() => handleKickPermissionChange("host-only")}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Host only</span>
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Only the room host can kick disconnected users
                </p>
              </div>
            </label>

            {/* Everyone Option */}
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="kickPermission"
                value="everyone"
                checked={room.kickPermission === "everyone"}
                onChange={() => handleKickPermissionChange("everyone")}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Everyone</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Any participant can kick disconnected users
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>💡 Settings can only be changed by the room host</p>
        </div>
      </CardContent>
    </Card>
  );
}
