import * as Tooltip from "@radix-ui/react-tooltip";
import * as Tabs from "@radix-ui/react-tabs";
import { Grid3X3, RefreshCw, BrainCircuit } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

import { useInventoryData } from "@/components/layouts/dashboard/inventory/useInventoryData";
import { prettifyBackendError } from "@/components/layouts/dashboard/inventory/inventoryUtils";

import { RacksTab } from "@/components/layouts/dashboard/inventory/tabs/RacksTab";
import { ProductsTab } from "@/components/layouts/dashboard/inventory/tabs/ProductsTab";
import { StockTab } from "@/components/layouts/dashboard/inventory/tabs/StockTab";
import { OperationsTab } from "@/components/layouts/dashboard/inventory/tabs/OperationsTab";
import { IdentifyTab } from "@/components/layouts/dashboard/inventory/tabs/IdentifyTab";

import { ScannerDialog } from "@/components/layouts/dashboard/inventory/modals/ScannerDialog";
import { ImportPreviewModal } from "@/components/layouts/dashboard/inventory/modals/ImportPreviewModal";
import { ImportResultModal } from "@/components/layouts/dashboard/inventory/modals/ImportResultModal";
import { AiScannerDialog, AiProcessingOverlay } from "@/components/layouts/dashboard/inventory/modals/AiScannerDialog";

import { MoveModal } from "@/components/layouts/dashboard/inventory/modals/MoveModal";
import { RackModal } from "@/components/layouts/dashboard/inventory/modals/RackModal";
import { ProductModal } from "@/components/layouts/dashboard/inventory/modals/ProductModal";
import { Spinner } from "@/components/ui/Spinner";

import "./InventoryContent.scss";
import "@/components/layouts/dashboard/inventory/tabs/RacksTab.scss";
import "@/components/layouts/dashboard/inventory/tabs/ProductsTab.scss";
import "@/components/layouts/dashboard/inventory/tabs/OperationsTab.scss";
import "@/components/layouts/dashboard/inventory/tabs/StatsTab.scss";

const InventoryContent = () => {
  const { t } = useTranslation();
  const invT = t.dashboardPage.content.inventory;

  const inv = useInventoryData(invT);

  return (
    <Tooltip.Provider delayDuration={100} skipDelayDuration={0}>
      <div className="personnel-view-container">
        {/* Hidden AI file input */}
        <input
          type="file"
          accept="image/png, image/jpeg, image/webp"
          ref={inv.aiFileInputRef}
          hidden
          onChange={inv.handleAiFileSelect}
        />
        <Tabs.Root defaultValue="racks" className="inventory-tabs-root">
          <header className="content-header">
            <div className="header-brand">
              <div className="system-tag">
                <Grid3X3 size={14} className="icon-glow" />
                <span>{invT.managementCenter}</span>
              </div>
              <h1>
                <span>{invT.inventoryHub}</span>
              </h1>
              <div
                style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}
              >
                <Tabs.List
                  className="ht-tabs-list"
                  style={{
                    display: "flex",
                    gap: "2rem",
                    marginTop: "1rem",
                    overflowX: "auto",
                    overflowY: "hidden",
                  }}
                >
                  <Tabs.Trigger value="racks" className="ht-tabs-trigger">
                    {invT.racksStructure}
                  </Tabs.Trigger>
                  <Tabs.Trigger value="products" className="ht-tabs-trigger">
                    {invT.productCatalog}
                  </Tabs.Trigger>
                  <Tabs.Trigger value="stock" className="ht-tabs-trigger">
                    {invT.stockTab}
                  </Tabs.Trigger>
                  <Tabs.Trigger value="operations" className="ht-tabs-trigger">
                    {invT.operationsTab}
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="identify"
                    className="ht-tabs-trigger"
                    style={{
                      color: "var(--accent-primary)",
                      borderColor: "var(--accent-primary)",
                    }}
                  >
                    <BrainCircuit
                      size={16}
                      style={{ marginRight: 6, marginTop: "2px" }}
                    />{" "}
                    {invT.identify.tabTitle}
                  </Tabs.Trigger>
                </Tabs.List>
                <button
                  onClick={inv.fetchData}
                  className="btn-action-ht"
                  disabled={inv.isLoading}
                >
                  {inv.isLoading ? (
                    <Spinner size={16} />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                </button>
              </div>
            </div>
          </header>

          <RacksTab
            racks={inv.racks}
            inventoryData={inv.inventoryData}
            isAdmin={inv.isAdmin}
            isLoading={inv.isLoading}
            fileInputRef={inv.fileInputRef}
            handleCSVImport={inv.handleCSVImport}
            onEditRack={(rack) => {
              inv.setEditingRack(rack);
              inv.setIsModalOpen(true);
            }}
            onDeleteRack={(id) => inv.handleDeleteRack(id)}
            onAddRack={() => {
              inv.setEditingRack(null);
              inv.setIsModalOpen(true);
            }}
            onSlotClick={inv.handleSlotClick}
            invT={invT}
          />

          <ProductsTab
            products={inv.products}
            searchQuery={inv.searchQuery}
            setSearchQuery={inv.setSearchQuery}
            productViewMode={inv.productViewMode}
            setProductViewMode={inv.setProductViewMode}
            isLoading={inv.isLoading}
            productFileInputRef={inv.productFileInputRef}
            handleProductCSVImport={inv.handleProductCSVImport}
            onDeleteProduct={inv.handleDeleteProduct}
            onEditProduct={(p) => {
              inv.setEditingProduct(p);
              inv.setIsProductModalOpen(true);
            }}
            onAddProduct={() => {
              inv.setEditingProduct(null);
              inv.setIsProductModalOpen(true);
            }}
            invT={invT}
          />

          <StockTab
            inventoryData={inv.inventoryData}
            searchQuery={inv.searchQuery}
            setSearchQuery={inv.setSearchQuery}
            isLoading={inv.isLoading}
            onMoveItem={(item) => {
              inv.setMovingItem(item);
              inv.setIsMoveModalOpen(true);
            }}
            invT={invT}
          />

          <IdentifyTab
            products={inv.products}
            trainingProduct={inv.trainingProduct}
            setTrainingProduct={inv.setTrainingProduct}
            identifiedProduct={inv.identifiedProduct}
            setIsAiScannerOpen={inv.setIsAiScannerOpen}
            aiFileInputRef={inv.aiFileInputRef}
            invT={invT}
          />

          <OperationsTab
            inboundBarcode={inv.inboundBarcode}
            setInboundBarcode={inv.setInboundBarcode}
            inboundResult={inv.inboundResult}
            outboundBarcode={inv.outboundBarcode}
            setOutboundBarcode={inv.setOutboundBarcode}
            outboundResult={inv.outboundResult}
            moveBarcode={inv.moveBarcode}
            setMoveBarcode={inv.setMoveBarcode}
            moveResult={inv.moveResult}
            inventoryData={inv.inventoryData}
            handleInbound={inv.handleInbound}
            handleOutbound={inv.handleOutbound}
            setMovingItem={inv.setMovingItem}
            setIsMoveModalOpen={inv.setIsMoveModalOpen}
            setScannerMode={inv.setScannerMode}
            setIsScannerOpen={inv.setIsScannerOpen}
            prettifyBackendError={(msg: string) =>
              prettifyBackendError(msg, invT)
            }
            invT={invT}
          />
        </Tabs.Root>
      </div>

      <MoveModal
        open={inv.isMoveModalOpen}
        onOpenChange={inv.setIsMoveModalOpen}
        item={inv.movingItem}
        racks={inv.racks}
        products={inv.products}
        inventory={inv.inventoryData}
        onMove={inv.handleMoveSubmit}
      />

      <ScannerDialog
        open={inv.isScannerOpen}
        onOpenChange={inv.setIsScannerOpen}
        invT={invT}
      />

      <ImportPreviewModal
        open={inv.isImportPreviewModalOpen}
        onOpenChange={inv.setIsImportPreviewModalOpen}
        importType={inv.importType}
        importPreviewData={inv.importPreviewData}
        setImportPreviewData={inv.setImportPreviewData}
        selectedPreviewItem={inv.selectedPreviewItem}
        setSelectedPreviewItem={inv.setSelectedPreviewItem}
        batchProgress={inv.batchProgress}
        onConfirmImport={inv.handleConfirmImport}
        invT={invT}
      />

      <ImportResultModal
        open={inv.isImportResultModalOpen}
        onOpenChange={inv.setIsImportResultModalOpen}
        importResult={inv.importResult}
        invT={invT}
      />

      <RackModal
        open={inv.isModalOpen}
        onOpenChange={inv.setIsModalOpen}
        editingRack={inv.editingRack}
        onSave={inv.handleSaveRack}
        existingRacks={inv.racks}
        hasItems={
          inv.editingRack
            ? inv.inventoryData.some(
              (i) => i.rackCode === inv.editingRack!.code,
            )
            : false
        }
      />

      <ProductModal
        open={inv.isProductModalOpen}
        onOpenChange={inv.setIsProductModalOpen}
        onSave={inv.handleSaveProduct}
        editingProduct={inv.editingProduct}
        hasInventoryItems={
          inv.editingProduct
            ? inv.inventoryData.some(
              (i) => i.productId === inv.editingProduct!.id,
            )
            : false
        }
      />

      <AiProcessingOverlay visible={inv.aiProcessing} />

      <AiScannerDialog
        open={inv.isAiScannerOpen}
        onOpenChange={inv.setIsAiScannerOpen}
        onCapture={inv.handleAiCapture}
      />
    </Tooltip.Provider>
  );
};

export default InventoryContent;
