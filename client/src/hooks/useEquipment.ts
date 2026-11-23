import { useCallback } from "react";
import type { Player, Equipment } from "@/lib/game/types";

/**
 * useEquipment — extracts equipItem and unequipItem functions.
 */
export function useEquipment({
  player,
  setPlayer,
  logPush,
}: {
  player: Player;
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  logPush: (msg: string) => void;
}) {
  const equipItem = useCallback(
    (itemId: string) => {
      try {
        const item = player.inv.find((i) => i.id === itemId);
        if (!item || item.type !== "equipment" || !item.equipmentSlot) {
          return;
        }

        if (!item.id || !item.name || !item.equipmentSlot) {
          console.error("Invalid item structure:", item);
          logPush("Invalid item. Cannot equip.");
          return;
        }

        setPlayer((p) => {
          try {
            // The item may have moved since the click's render, for example
            // when React batches two equip actions for the same item.
            const currentItem = p.inv.find((i) => i.id === itemId);
            if (!currentItem || currentItem.type !== "equipment" || !currentItem.equipmentSlot) {
              return p;
            }

            const slot = currentItem.equipmentSlot;
            const newInv = p.inv.filter((i) => i.id !== itemId);
            const oldItem = p.equipment[slot];
            if (oldItem) newInv.push({ ...oldItem });

            return {
              ...p,
              inv: newInv,
              equipment: { ...p.equipment, [slot]: { ...currentItem } },
            };
          } catch (setPlayerError) {
            console.error("Error in setPlayer callback:", setPlayerError);
            return p;
          }
        });

        logPush(`Equipped ${item.name}!`);

        setTimeout(() => {
          setPlayer((p) => ({ ...p }));
        }, 100);
      } catch (error) {
        console.error("Error equipping item:", error);
        logPush("Error equipping item. Please try again.");
      }
    },
    [player.inv, setPlayer, logPush],
  );

  const unequipItem = useCallback(
    (slot: keyof Equipment) => {
      try {
        const item = player.equipment[slot];
        if (!item) {
          return;
        }

        if (!item.id || !item.name) {
          console.error("Invalid item structure:", item);
          logPush("Invalid item. Cannot unequip.");
          return;
        }

        setPlayer((p) => {
          try {
            // Act on the item the player clicked, not a later replacement.
            const currentItem = p.equipment[slot];
            if (!currentItem || currentItem.id !== item.id) return p;

            const newInv = [...p.inv, { ...currentItem }];
            const newEquipment = { ...p.equipment };
            newEquipment[slot] = undefined;

            return {
              ...p,
              inv: newInv,
              equipment: newEquipment,
            };
          } catch (setPlayerError) {
            console.error(
              "Error in setPlayer callback (unequip):",
              setPlayerError,
            );
            return p;
          }
        });

        logPush(`Unequipped ${item.name}!`);

        setTimeout(() => {
          setPlayer((p) => ({ ...p }));
        }, 100);
      } catch (error) {
        console.error("Error unequipping item:", error);
        logPush("Error unequipping item. Please try again.");
      }
    },
    [player.equipment, setPlayer, logPush],
  );

  return { equipItem, unequipItem };
}
