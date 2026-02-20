import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface RebirthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  playerLevel: number;
  rebirthCount: number;
}

export function RebirthModal({ open, onOpenChange, onConfirm, playerLevel, rebirthCount }: RebirthModalProps) {
  const earnedPoints = Math.floor(playerLevel * 10 * (1 + rebirthCount * 0.5));
  const newBonus = (rebirthCount + 1) * 15;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>⚡ Rebirth</DialogTitle>
          <DialogDescription>
            Reset your progress to gain permanent bonuses!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg">
            <p className="text-red-400 font-bold">⚠️ This will reset:</p>
            <ul className="text-red-300 text-sm mt-2 space-y-1">
              <li>• All gold (₲)</li>
              <li>• All keys</li>
              <li>• All gates cleared</li>
              <li>• Fatigue</li>
            </ul>
          </div>

          <div className="bg-green-900/20 border border-green-500/30 p-3 rounded-lg">
            <p className="text-green-400 font-bold">✅ You will keep:</p>
            <ul className="text-green-300 text-sm mt-2 space-y-1">
              <li>• Your level ({playerLevel})</li>
              <li>• All allocated stats</li>
              <li>• Your Spirit Legion</li>
            </ul>
          </div>

          <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg text-center">
            <p className="text-purple-400 font-bold">🎁 You will gain:</p>
            <p className="text-2xl font-bold text-purple-300">+{earnedPoints} Prestige Points</p>
            <p className="text-purple-400">+{newBonus}% Power Bonus</p>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-500 font-bold"
          >
            Confirm Rebirth
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
