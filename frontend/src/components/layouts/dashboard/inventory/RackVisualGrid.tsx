import { memo, useEffect, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { Rack } from "./InventoryContent.types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const RackVisualGrid = memo(({ rack }: { rack: Rack }) => {
    const [occupiedCount, setOccupiedCount] = useState(0);
    const totalSlots = rack.m * rack.n;
    const displaySlotsCount = Math.min(totalSlots, 120);

    useEffect(() => {
        const fetchOccupancy = async () => {
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`${API_BASE_URL}/api/Report/rack-utilization`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const stats = data.find((r: any) => r.rackCode === rack.id);
                    if (stats) setOccupiedCount(stats.occupiedSlots);
                }
            } catch (e) { console.error("Occupancy fetch failed"); }
        };
        fetchOccupancy();
    }, [rack.id]);

    const occupancyRatio = totalSlots > 0 ? occupiedCount / totalSlots : 0;
    const visualOccupiedLimit = Math.floor(displaySlotsCount * occupancyRatio);

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
            {Array.from({ length: displaySlotsCount }).map((_, i) => {
                const row = Math.floor(i / rack.n) + 1;
                const col = (i % rack.n) + 1;
                const isOccupied = i < visualOccupiedLimit;

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
                                    <p className="name">{isOccupied ? "Occupied" : "Empty Space"}</p>
                                    {isOccupied && <span className="status">Status: Validated</span>}
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