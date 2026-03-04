import React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Plus, FileUp } from "lucide-react";
import type { Rack, FullInventoryItem } from "@/components/layouts/dashboard/inventory/InventoryContent.types";
import { RackCard } from "@/components/layouts/dashboard/inventory/RackCard";
import { SkeletonGrid } from "@/components/layouts/dashboard/inventory/InventorySkeletons";

interface RacksTabProps {
    racks: Rack[];
    inventoryData: FullInventoryItem[];
    isAdmin: boolean;
    isLoading: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleCSVImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onEditRack: (rack: Rack) => void;
    onDeleteRack: (id: number) => void;
    onAddRack: () => void;
    onSlotClick: (barcode: string) => void;
    invT: any;
}

export const RacksTab = ({
    racks,
    inventoryData,
    isAdmin,
    isLoading,
    fileInputRef,
    handleCSVImport,
    onEditRack,
    onDeleteRack,
    onAddRack,
    onSlotClick,
    invT,
}: RacksTabProps) => (
    <Tabs.Content value="racks">
        {isAdmin && (
            <div
                className="action-bar"
                style={{ justifyContent: "flex-start", gap: "1rem" }}
            >
                <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    hidden
                    onChange={handleCSVImport}
                />
                <button
                    className="btn-primary-ht"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <FileUp size={18} />
                    <span>{invT.importCSV}</span>
                </button>
                <button className="btn-primary-ht" onClick={onAddRack}>
                    <Plus size={18} />
                    <span>{invT.addRack}</span>
                </button>
            </div>
        )}
        <div className="stats-grid">
            {racks.map((r) => (
                <RackCard
                    key={r.id}
                    rack={r}
                    inventory={inventoryData.filter((i) => i.rackCode === r.code)}
                    isAdmin={isAdmin}
                    onEdit={(rack) => onEditRack(rack)}
                    onDelete={() => onDeleteRack(r.id)}
                    onSlotClick={onSlotClick}
                />
            ))}
            {isLoading && <SkeletonGrid count={6} type="rack" />}
        </div>
    </Tabs.Content>
);
