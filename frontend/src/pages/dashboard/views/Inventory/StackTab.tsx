import React from "react";
import { Search, MapPin, Box, RefreshCw, Move } from "lucide-react";
import type { FullInventoryItem } from "./InventoryContent.types";

interface StockTabProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    inventoryData: FullInventoryItem[];
    isLoading: boolean;
    onMoveItem: (item: FullInventoryItem) => void;
}

export const StockTab = ({
                             searchQuery,
                             setSearchQuery,
                             inventoryData,
                             isLoading,
                             onMoveItem
                         }: StockTabProps) => {

    const filteredInventory = inventoryData.filter(item =>
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode.includes(searchQuery) ||
        item.rackCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="stock-tab-container">
            <div className="action-bar">
                <div className="search-container">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Szukaj w magazynie (nazwa, kod, regał)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="stock-grid">
                {filteredInventory.map(item => (
                    <div
                        key={item.itemId}
                        className={`glass-card stock-item-card ${item.barcode === searchQuery ? 'highlight' : ''}`}
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
                                <span className="label">Status:</span>
                                <span className={`status-tag ${item.status.toLowerCase()}`}>{item.status}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Data przyjęcia:</span>
                                <span>{new Date(item.entryDate).toLocaleDateString()}</span>
                            </div>
                            {item.expirationDate && (
                                <div className="detail-row">
                                    <span className="label">Data ważności:</span>
                                    <span className={item.daysUntilExpiration && item.daysUntilExpiration < 5 ? 'text-danger' : ''}>
                                        {new Date(item.expirationDate).toLocaleDateString()}
                                        {item.daysUntilExpiration !== undefined && ` (${item.daysUntilExpiration} dni)`}
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
                                    <RefreshCw size={12} /> {item.currentRackTemperature}°C
                                </div>
                            </div>
                            <div className="received-by">
                                Przyjął: <strong>{item.receivedByUsername}</strong>
                            </div>
                            <button
                                className="btn-action-ht"
                                onClick={() => onMoveItem(item)}
                                title="Przesuń towar"
                                style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                            >
                                <Move size={14} /> <span>Przesuń</span>
                            </button>
                        </div>
                    </div>
                ))}

                {inventoryData.length === 0 && !isLoading && (
                    <div className="empty-state-ht">Magazyn jest obecnie pusty.</div>
                )}

                {!isLoading && filteredInventory.length === 0 && inventoryData.length > 0 && (
                    <div className="empty-state-ht">Nie znaleziono produktów spełniających kryteria wyszukiwania.</div>
                )}
            </div>
        </div>
    );
};