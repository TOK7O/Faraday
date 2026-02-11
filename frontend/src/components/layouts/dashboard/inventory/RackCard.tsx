import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  MoreVertical,
  Thermometer,
  Weight,
  Maximize,
  Grid3X3,
  Edit2,
  Trash2,
} from "lucide-react";
import type { Rack, FullInventoryItem } from "./InventoryContent.types";
import { RackVisualGrid } from "./RackVisualGrid";
import { useTranslation } from "@/context/LanguageContext";
import "./RackCard.scss";

interface RackCardProps {
  rack: Rack;
  inventory: FullInventoryItem[];
  isAdmin: boolean;
  onEdit: (rack: Rack) => void;
  onDelete: (id: number) => void;
  onSlotClick: (productName: string) => void;
}

export const RackCard = ({
  rack,
  inventory,
  isAdmin,
  onEdit,
  onDelete,
  onSlotClick,
}: RackCardProps) => {
  const { t } = useTranslation();
  const invT = t.dashboardPage.content.inventory;

  return (
    <div className="rack-card glass-card fade-in-up">
      <div className="card-header">
        <div className="title-group">
          <h3 className="rack-code">{rack.code}</h3>
          <span className="rack-comment">{rack.comment}</span>
        </div>

        {isAdmin && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="btn-action-ht">
                <MoreVertical size={18} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="dropdown-ht" align="end">
                <DropdownMenu.Item
                  className="dd-item"
                  onClick={() => onEdit(rack)}
                >
                  <Edit2 size={14} /> {invT.edit}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="dd-item danger"
                  onClick={() => onDelete(rack.id)}
                >
                  <Trash2 size={14} /> {invT.delete}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>

      <div className="stats-mini-grid">
        <div className="data">
          <span className="label">
            <Thermometer size={10} /> {invT.tempRange}
          </span>
          <span className="value">
            {rack.tempMin}° / {rack.tempMax}°C
          </span>
        </div>
        <div className="data">
          <span className="label">
            <Weight size={10} /> {invT.capacity}
          </span>
          <span className="value">{rack.maxWeight} kg</span>
        </div>
      </div>

      <div className="grid-container">
        <RackVisualGrid
          rack={rack}
          inventory={inventory}
          onSlotClick={onSlotClick}
        />
      </div>

      <div className="card-footer">
        <div className="footer-meta">
          <Maximize size={12} className="meta-icon" />
          <span>
            {rack.maxWidth}×{rack.maxHeight}×{rack.maxDepth} mm
          </span>
        </div>
        <div className="footer-meta">
          <Grid3X3 size={12} className="meta-icon" />
          <span>
            {rack.m}R × {rack.n}C
          </span>
        </div>
      </div>
    </div>
  );
};
