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
            const newInv = [...p.inv].filter((i) => i.id !== itemId);
            const oldItem = item.equipmentSlot
              ? p.equipment[item.equipmentSlot]
              : undefined;

            if (oldItem) {
              newInv.push({ ...oldItem });
            }

            const eq = p.equipment || {};
            const newEquipment = {
              weapon: eq.weapon ? { ...eq.weapon } : undefined,
              armor: eq.armor ? { ...eq.armor } : undefined,
              accessory: eq.accessory ? { ...eq.accessory } : undefined,
            };

            if (item.equipmentSlot === "weapon") {
              newEquipment.weapon = { ...item };
            } else if (item.equipmentSlot === "armor") {
              newEquipment.armor = { ...item };
            } else if (item.equipmentSlot === "accessory") {
              newEquipment.accessory = { ...item };
            }

            return {
              ...p,
              inv: newInv,
              equipment: newEquipment,
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
            const newInv = [...p.inv, { ...item }];
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
