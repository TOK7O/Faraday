import { memo } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { Rack } from "./InventoryContent.types";

export const RackVisualGrid = memo(({ rack }: { rack: Rack }) => {
    const totalSlots = rack.m * rack.n;
    const displaySlots = Math.min(totalSlots, 120);

    return (
        <div className="rack-grid-container" style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${rack.n}, 1fr)`,
            gap: '2px',
            background: 'rgba(255,255,255,0.05)',
            padding: '4px',
            borderRadius: '4px',
            marginBottom: '1.5rem'
        }}>
            {Array.from({ length: displaySlots }).map((_, i) => {
                const row = Math.floor(i / rack.n) + 1;
                const col = (i % rack.n) + 1;
                const isOccupied = Math.random() > 0.85;

                return (
                    <Tooltip.Root key={`${rack.id}-slot-${i}`}>
                        <Tooltip.Trigger asChild>
                            <div
                                data-occupied={isOccupied}
                                style={{
                                    aspectRatio: '1',
                                    background: isOccupied ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                                    opacity: isOccupied ? 0.8 : 0.2,
                                    borderRadius: '1px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                            <Tooltip.Content className="tooltip-content" sideOffset={5}>
                                <div className="tooltip-inner">
                                    <span className="pos">Slot: {row}R x {col}C</span>
                                    <p className="name">{isOccupied ? "Zasób #8421" : "Wolna przestrzeń"}</p>
                                    {isOccupied && <span className="status">Status: OK | FIFO: 12.02</span>}
                                </div>
                                <Tooltip.Arrow className="tooltip-arrow" />
                            </Tooltip.Content>
                        </Tooltip.Portal>
                    </Tooltip.Root>
                );
            })}
        </div>
    );
});