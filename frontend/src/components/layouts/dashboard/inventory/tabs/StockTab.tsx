import * as Tabs from "@radix-ui/react-tabs";
import { Search, MapPin, Box, RefreshCw } from "lucide-react";
import type { FullInventoryItem } from "@/components/layouts/dashboard/inventory/InventoryContent.types";

interface StockTabProps {
    inventoryData: FullInventoryItem[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    isLoading: boolean;
    onMoveItem: (item: FullInventoryItem) => void;
    invT: any;
}

export const StockTab = ({
    inventoryData,
    searchQuery,
    setSearchQuery,
    isLoading,
    onMoveItem,
    invT,
}: StockTabProps) => (
    <Tabs.Content value="stock">
        <div className="action-bar">
            <div className="search-container">
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder={invT.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
        <div className="stock-grid">
            {inventoryData
                .filter(
                    (item) =>
                        item.productName
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                        item.barcode.includes(searchQuery) ||
                        item.rackCode
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                )
                .map((item) => (
                    <div
                        key={item.itemId}
                        className={`glass-card stock-item-card ${item.barcode === searchQuery ? "highlight" : ""}`}
                    >
                        <div className="stock-item-header">
                            <div className="product-info">
                                <div className="barcode-tag">{item.barcode}</div>
                                <h3>{item.productName}</h3>
                            </div>
                            <div className="location-badge">
                                <MapPin size={14} /> {item.locationCode}
                            </div>
                        </div>

                        <div className="stock-item-details">
                            <div className="detail-row">
                                <span className="label">{invT.items.status}:</span>
                                <span
                                    className={`status-tag ${item.status.toLowerCase()}`}
                                >
                                    {item.status}
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="label">{invT.items.entryDate}:</span>
                                <span>
                                    {new Date(item.entryDate).toLocaleDateString()}
                                </span>
                            </div>
                            {item.expirationDate && (
                                <div className="detail-row">
                                    <span className="label">
                                        {invT.items.expirationDate}:
                                    </span>
                                    <span
                                        className={
                                            item.daysUntilExpiration &&
                                                item.daysUntilExpiration <= 7
                                                ? "text-danger"
                                                : ""
                                        }
                                    >
                                        {new Date(item.expirationDate).toLocaleDateString()}
                                        {item.daysUntilExpiration !== undefined &&
                                            ` (${item.daysUntilExpiration} ${invT.items.days})`}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="stock-item-footer">
                            <div className="storage-info">
                                <div className="info-chip">
                                    <Box size={12} /> {item.productWeightKg}kg
                                </div>
                                <div className="info-chip">
                                    <RefreshCw size={12} />{" "}
                                    {item.currentRackTemperature.toFixed(1)}
                                    °C
                                </div>
                            </div>
                            <div className="received-by">
                                {invT.items.receivedBy}:{" "}
                                <strong>{item.receivedByUsername}</strong>
                            </div>
                            <button
                                className="btn-action-ht"
                                onClick={() => onMoveItem(item)}
                                title={invT.moveItem}
                                style={{
                                    marginLeft: "auto",
                                    padding: "4px 8px",
                                    fontSize: "0.8rem",
                                }}
                            >
                                <span>{invT.moveTo}</span>
                            </button>
                        </div>
                    </div>
                ))}
            {inventoryData.length === 0 && !isLoading && (
                <div className="empty-state-ht">{invT.emptyStock}</div>
            )}
        </div>
    </Tabs.Content>
);
