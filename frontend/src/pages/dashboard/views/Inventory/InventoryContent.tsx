import React, { useState, useRef, useEffect } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Tabs from "@radix-ui/react-tabs";
import { Grid3X3, RefreshCw } from "lucide-react";

import { RacksTab } from "./RacksTab";
import { ProductsTab } from "./ProductsTab";
import { StockTab } from "./StackTab";
import { OperationsTab } from "./OperationsTab";

import { RackModal } from "@/components/layouts/dashboard/inventory/modals/RackModal";
import { ProductModal } from "@/components/layouts/dashboard/inventory/modals/ProductModal";
import { MoveModal } from "@/components/layouts/dashboard/inventory/modals/MoveModal";
import { ImportPreviewModal } from "@/components/layouts/dashboard/inventory/modals/importPreviewModal";
import { ScannerModal } from "@/components/layouts/dashboard/inventory/modals/ScannerModal";

import { useInventoryData } from "@/hooks/useInventoryData.tsx";
import { parseCSV, prettifyBackendError } from "@/utils/InventoryHelpers.tsx";
import { useTranslation } from "@/context/LanguageContext";
import { Spinner } from "@/components/ui/Spinner";

import "./InventoryContent.scss";

const InventoryContent = () => {
    const { t } = useTranslation();
    const invT = t.dashboardPage.content.inventory;

    // Custom Hook
    const {
        racks, products, inventoryData, isLoading,
        refreshData, performOperation, saveItem, deleteItem, moveItem
    } = useInventoryData();

    // stany ui
    const [searchQuery, setSearchQuery] = useState("");
    const [productViewMode, setProductViewMode] = useState<'grid' | 'list'>('grid');
    const [activeTab, setActiveTab] = useState("racks");

    const [modals, setModals] = useState({
        rack: false,
        product: false,
        move: false,
        importPreview: false,
        importResult: false,
        scanner: false
    });

    const [editingRack, setEditingRack] = useState<any>(null);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [movingItem, setMovingItem] = useState<any>(null);

    const [importType, setImportType] = useState<'racks' | 'products' | null>(null);
    const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
    const [importResult, setImportResult] = useState<any>(null);

    const [operationStates, setOperationStates] = useState({
        inboundBarcode: "",
        outboundBarcode: "",
        moveBarcode: "",
        inboundResult: null,
        outboundResult: null,
        moveResult: null,
        scannerMode: 'inbound' as 'inbound' | 'outbound' | 'move'
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const productFileInputRef = useRef<HTMLInputElement>(null);

    // handlers
    useEffect(() => { refreshData(); }, [refreshData]);

    const handleCSVImportTrigger = (e: React.ChangeEvent<HTMLInputElement>, type: 'racks' | 'products') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const results = parseCSV(ev.target?.result as string, type, racks, products, inventoryData);
            setImportType(type);
            setImportPreviewData(results);
            setModals(prev => ({ ...prev, importPreview: true }));
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const handleSlotClick = (barcode: string) => {
        setSearchQuery(barcode);
        setActiveTab("stock");
    };

    return (
        <Tooltip.Provider delayDuration={100}>
            <div className="personnel-view-container">
                <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="inventory-tabs-root">
                    <header className="content-header">
                        <div className="header-brand">
                            <div className="system-tag"><Grid3X3 size={14} className="icon-glow" /><span>{invT.managementCenter}</span></div>
                            <h1>Inventory <span className="outline-text">Hub</span></h1>
                            <div className="header-nav-group">
                                <Tabs.List className="ht-tabs-list">
                                    <Tabs.Trigger value="racks" className="ht-tabs-trigger">{invT.racksStructure}</Tabs.Trigger>
                                    <Tabs.Trigger value="products" className="ht-tabs-trigger">{invT.productCatalog}</Tabs.Trigger>
                                    <Tabs.Trigger value="stock" className="ht-tabs-trigger">Stan magazynowy</Tabs.Trigger>
                                    <Tabs.Trigger value="operations" className="ht-tabs-trigger">Operacje</Tabs.Trigger>
                                </Tabs.List>
                                <button onClick={refreshData} className="btn-action-ht" disabled={isLoading}>
                                    {isLoading ? <Spinner size={16} /> : <RefreshCw size={16} />}
                                </button>
                            </div>
                        </div>
                    </header>

                    <Tabs.Content value="racks">
                        <RacksTab
                            invT={invT} isLoading={isLoading} racks={racks} inventoryData={inventoryData}
                            fileInputRef={fileInputRef}
                            handleCSVImport={(e) => handleCSVImportTrigger(e, 'racks')}
                            onAddRack={() => { setEditingRack(null); setModals(prev => ({ ...prev, rack: true })); }}
                            onEditRack={(rack) => { setEditingRack(rack); setModals(prev => ({ ...prev, rack: true })); }}
                            onDeleteRack={deleteItem} onSlotClick={handleSlotClick}
                        />
                    </Tabs.Content>

                    <Tabs.Content value="products">
                        <ProductsTab
                            invT={invT} isLoading={isLoading} products={products}
                            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                            productViewMode={productViewMode} setProductViewMode={setProductViewMode}
                            productFileInputRef={productFileInputRef}
                            handleProductCSVImport={(e) => handleCSVImportTrigger(e, 'products')}
                            onAddProduct={() => { setEditingProduct(null); setModals(prev => ({ ...prev, product: true })); }}
                            onEditProduct={(p) => { setEditingProduct(p); setModals(prev => ({ ...prev, product: true })); }}
                            onDeleteProduct={deleteItem}
                        />
                    </Tabs.Content>

                    <Tabs.Content value="stock">
                        <StockTab
                            inventoryData={inventoryData} isLoading={isLoading}
                            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                            onMoveItem={(item) => { setMovingItem(item); setModals(prev => ({ ...prev, move: true })); }}
                        />
                    </Tabs.Content>

                    <Tabs.Content value="operations">
                        <OperationsTab
                            inventoryData={inventoryData}
                            operationStates={operationStates}
                            setOperationStates={setOperationStates}
                            performOperation={performOperation}
                            setIsScannerOpen={(open) => setModals(prev => ({ ...prev, scanner: open }))}
                            setIsMoveModalOpen={(open) => setModals(prev => ({ ...prev, move: open }))}
                            setMovingItem={setMovingItem}
                            prettifyBackendError={prettifyBackendError}
                        />
                    </Tabs.Content>
                </Tabs.Root>
            </div>

            <RackModal
                open={modals.rack} onOpenChange={(open) => setModals(prev => ({ ...prev, rack: open }))}
                editingRack={editingRack} onSave={refreshData} invT={invT} existingRacks={racks}
            />

            <ProductModal
                open={modals.product} onOpenChange={(open) => setModals(prev => ({ ...prev, product: open }))}
                editingProduct={editingProduct} onSave={refreshData}
            />

            <MoveModal
                open={modals.move} onOpenChange={(open) => setModals(prev => ({ ...prev, move: open }))}
                item={movingItem} racks={racks} products={products} inventory={inventoryData}
                onMove={moveItem}
            />

            <ScannerModal
                open={modals.scanner} onOpenChange={(open) => setModals(prev => ({ ...prev, scanner: open }))}
                mode={operationStates.scannerMode}
                onScanSuccess={(code) => console.log("Scanned:", code)} // Tutaj logika po skanie
            />

            <ImportPreviewModal
                isOpen={modals.importPreview}
                onOpenChange={(open) => setModals(prev => ({ ...prev, importPreview: open }))}
                importType={importType} importPreviewData={importPreviewData}
            />
        </Tooltip.Provider>
    );
};

export default InventoryContent;