import { memo } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { Rack, FullInventoryItem } from "./InventoryContent.types";
import "./RackVisualGrid.scss";

export const RackVisualGrid = memo(({ rack, inventory, onSlotClick }: { rack: Rack, inventory: FullInventoryItem[], onSlotClick: (barcode: string) => void }) => {
    const slotMap = new Map<string, FullInventoryItem>();
    inventory.forEach(item => {
        slotMap.set(`${item.slotX},${item.slotY}`, item);
    });

    return (
        <div
            className="rack-grid-container"
            style={{ gridTemplateColumns: `repeat(${rack.n}, 1fr)` }}
        >
            {Array.from({ length: rack.m }).map((_, rIndex) => {
                const rowNum = rack.m - rIndex;
                return Array.from({ length: rack.n }).map((_, cIndex) => {
                    const colNum = cIndex + 1;
                    const item = slotMap.get(`${colNum},${rowNum}`);
                    const isOccupied = !!item;

                    return (
                        <Tooltip.Root key={`${rack.code}-${colNum}-${rowNum}`}>
                            <Tooltip.Trigger asChild>
                                <div
                                    className={`slot ${isOccupied ? 'occupied' : 'empty'}`}
                                    onClick={(e) => {
                                        if (item) {
                                            e.stopPropagation();
                                            onSlotClick(item.barcode);
                                        }
                                    }}
                                />
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                                <Tooltip.Content className="tooltip-content" sideOffset={5}>
                                    <div className="tooltip-inner">
                                        <span className="pos">Pos: {rowNum}R x {colNum}C</span>
                                        {item ? (
                                            <>
                                                <p className="name">{item.productName}</p>
                                                <span className="status">Waga: {item.productWeightKg}kg</span>
                                                <div className="hint">Kliknij, aby zobaczyć szczegóły</div>
                                            </>
                                        ) : (
                                            <p className="name empty-text">Wolne miejsce</p>
                                        )}
                                    </div>
                                    <Tooltip.Arrow className="tooltip-arrow" />
                                </Tooltip.Content>
                            </Tooltip.Portal>
                        </Tooltip.Root>
                    );
                });
            })}
        </div>
    );
});