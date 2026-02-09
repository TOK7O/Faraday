import { memo } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { Rack } from "./InventoryContent.types";

export const RackVisualGrid = memo(({ rack, inventory, onSlotClick }: { rack: Rack, inventory: FullInventoryItem[], onSlotClick: (barcode: string) => void }) => {
    // Create a map of "X,Y" -> Item
    const slotMap = new Map<string, FullInventoryItem>();
    inventory.forEach(item => {
        slotMap.set(`${item.slotX},${item.slotY}`, item);
    });

    return (
        <div className="rack-grid-container" style={{
            display: 'grid',
            // Rows are Y, Columns are X.
            gridTemplateColumns: `repeat(${rack.n}, 1fr)`,
            gap: '2px',
            background: 'rgba(255,255,255,0.05)',
            padding: '4px',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            aspectRatio: rack.n / rack.m > 2 ? 'auto' : 'unset'
        }}>
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
                                    onClick={(e) => {
                                        if (item) {
                                            e.stopPropagation();
                                            onSlotClick(item.barcode);
                                        }
                                    }}
                                    style={{
                                        aspectRatio: '1',
                                        background: isOccupied ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                                        opacity: isOccupied ? 0.9 : 0.2,
                                        borderRadius: '1px',
                                        cursor: isOccupied ? 'pointer' : 'default',
                                        transition: 'all 0.15s ease',
                                        position: 'relative'
                                    }}
                                />
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                                <Tooltip.Content className="tooltip-content" sideOffset={5} style={{ zIndex: 1000 }}>
                                    <div className="tooltip-inner">
                                        <span className="pos">Pos: {rowNum}R x {colNum}C</span>
                                        {item ? (
                                            <>
                                                <p className="name" style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{item.productName}</p>
                                                <span className="status" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Waga: {item.productWeightKg}kg</span>
                                                <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-muted)' }}>Kliknij, aby zobaczyć szczegóły</div>
                                            </>
                                        ) : (
                                            <p className="name" style={{ color: 'var(--text-muted)' }}>Wolne miejsce</p>
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