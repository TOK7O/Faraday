import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Thermometer, Weight, Maximize, Grid3X3, Edit2, Trash2 } from "lucide-react";
import type { Rack, FullInventoryItem } from "./InventoryContent.types";
import { RackVisualGrid } from "./RackVisualGrid";
import { useTranslation } from "@/context/LanguageContext";

interface RackCardProps {
    rack: Rack;
    inventory: FullInventoryItem[];
    onEdit: (rack: Rack) => void;
    onDelete: (id: number) => void;
    onSlotClick: (productName: string) => void;
}

export const RackCard = ({ rack, inventory, onEdit, onDelete, onSlotClick }: RackCardProps) => {
    const { t } = useTranslation();
    const invT = t.dashboardPage.content.inventory;

    return (
        <div className="glass-card fade-in-up" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>{rack.code}</h3>
                    <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>{rack.comment}</span>
                </div>
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button className="btn-action-ht"><MoreVertical size={18} /></button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                        <DropdownMenu.Content className="dropdown-ht" align="end">
                            <DropdownMenu.Item className="dd-item" onClick={() => onEdit(rack)}>
                                <Edit2 size={14} /> {invT.edit}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item className="dd-item danger" onClick={() => onDelete(rack.id)}>
                                <Trash2 size={14} /> {invT.delete}
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.2rem' }}>
                <div className="data">
                    <span className="label"><Thermometer size={10} /> {invT.tempRange}</span>
                    <span className="value" style={{ fontSize: '1.1rem' }}>{rack.tempMin}° / {rack.tempMax}°C</span>
                </div>
                <div className="data">
                    <span className="label"><Weight size={10} /> {invT.capacity}</span>
                    <span className="value" style={{ fontSize: '1.1rem' }}>{rack.maxWeight} kg</span>
                </div>
            </div>
            {/* Visual Grid */}
            <RackVisualGrid rack={rack} inventory={inventory} onSlotClick={onSlotClick} />

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-input)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Maximize size={12} style={{ color: 'var(--accent-primary)', marginRight: '5px' }} /> {rack.maxWidth}×{rack.maxHeight}×{rack.maxDepth} mm
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Grid3X3 size={12} style={{ color: 'var(--accent-primary)', marginRight: '5px' }} /> {rack.m}R × {rack.n}C
                </div>
            </div>
        </div>
    );
};