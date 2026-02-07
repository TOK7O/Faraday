import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Thermometer, Weight, Maximize, Grid3X3, Edit2, Trash2 } from "lucide-react";
import type { Rack } from "./InventoryContent.types";
import { RackVisualGrid } from "./RackVisualGrid";

interface RackCardProps {
    rack: Rack;
    onEdit: (rack: Rack) => void;
    onDelete: (id: string) => void;
}

export const RackCard = ({ rack, onEdit, onDelete }: RackCardProps) => (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <RackVisualGrid rack={rack} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>{rack.id}</h3>
                <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>{rack.comment}</span>
            </div>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="btn-action-ht"><MoreVertical size={18} /></button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className="dropdown-ht" align="end">
                        <DropdownMenu.Item className="dd-item" onClick={() => onEdit(rack)}>
                            <Edit2 size={14} /> Edytuj
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className="dd-item danger" onClick={() => onDelete(rack.id)}>
                            <Trash2 size={14} /> Usuń
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.2rem' }}>
            <div className="data">
                <span className="label"><Thermometer size={10}/> Zakres temp.</span>
                <span className="value" style={{ fontSize: '1.1rem' }}>{rack.tempMin}° / {rack.tempMax}°C</span>
            </div>
            <div className="data">
                <span className="label"><Weight size={10}/> Nośność</span>
                <span className="value" style={{ fontSize: '1.1rem' }}>{rack.maxWeight} kg</span>
            </div>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-input)', display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <Maximize size={12} style={{color: 'var(--accent-primary)'}} /> {rack.maxWidth}×{rack.maxHeight}×{rack.maxDepth} mm
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <Grid3X3 size={12} style={{color: 'var(--accent-primary)'}} /> {rack.m}R × {rack.n}C
            </div>
        </div>
    </div>
);