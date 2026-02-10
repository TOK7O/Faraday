import React from "react";
import { Plus, FileUp } from "lucide-react";
import { RackCard } from "@/components/layouts/dashboard/inventory/RackCard";
import { SkeletonGrid } from "@/components/layouts/dashboard/inventory/InventorySkeletons";
import type { Rack, FullInventoryItem } from "@/components/layouts/dashboard/inventory/InventoryContent.types";

interface RacksTabProps {
    invT: any;
    isLoading: boolean;
    racks: Rack[];
    inventoryData: FullInventoryItem[];
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleCSVImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddRack: () => void;
    onEditRack: (rack: Rack) => void;
    onDeleteRack: (id: number | string) => void;
    onSlotClick: (barcode: string) => void;
}

export const RacksTab = ({
                             invT,
                             isLoading,
                             racks,
                             inventoryData,
                             fileInputRef,
                             handleCSVImport,
                             onAddRack,
                             onEditRack,
                             onDeleteRack,
                             onSlotClick
                         }: RacksTabProps) => {
    return (
        <div className="racks-tab-container">
            <div className="action-bar" style={{ justifyContent: 'flex-start', gap: '1rem' }}>
                <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    hidden
                    onChange={handleCSVImport}
                />
                <button className="btn-primary-ht" onClick={() => fileInputRef.current?.click()}>
                    <FileUp size={18} />
                    <span>{invT.importCSV}</span>
                </button>
                <button className="btn-primary-ht" onClick={onAddRack}>
                    <Plus size={18} />
                    <span>{invT.addRack}</span>
                </button>
            </div>

            <div className="stats-grid">
                {racks.map(r => (
                    <RackCard
                        key={r.id}
                        rack={r}
                        inventory={inventoryData.filter(i => i.rackCode === r.code)}
                        onEdit={onEditRack}
                        onDelete={() => onDeleteRack(r.id)}
                        onSlotClick={onSlotClick}
                    />
                ))}
                {isLoading && <SkeletonGrid count={6} type="rack" />}
                {!isLoading && racks.length === 0 && (
                    <div className="empty-state">Nie znaleziono żadnych regałów.</div>
                )}
            </div>
        </div>
    );
};