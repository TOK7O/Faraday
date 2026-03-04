import React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Plus, FileUp, Search, LayoutGrid, List } from "lucide-react";
import type { Product } from "@/components/layouts/dashboard/inventory/InventoryContent.types";
import { ProductCatalog } from "@/components/layouts/dashboard/inventory/ProductCatalog";

interface ProductsTabProps {
    products: Product[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    productViewMode: "grid" | "list";
    setProductViewMode: (mode: "grid" | "list") => void;
    isLoading: boolean;
    productFileInputRef: React.RefObject<HTMLInputElement | null>;
    handleProductCSVImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDeleteProduct: (id: number | string) => Promise<void>;
    onEditProduct: (p: Product) => void;
    onAddProduct: () => void;
    invT: any;
}

export const ProductsTab = ({
    products,
    searchQuery,
    setSearchQuery,
    productViewMode,
    setProductViewMode,
    isLoading,
    productFileInputRef,
    handleProductCSVImport,
    onDeleteProduct,
    onEditProduct,
    onAddProduct,
    invT,
}: ProductsTabProps) => (
    <Tabs.Content value="products">
        <div className="action-bar">
            <div className="search-container">
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder={invT.searchProduct}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="view-mode-toggle">
                    <button
                        className={`toggle-btn ${productViewMode === "grid" ? "active" : ""}`}
                        onClick={() => setProductViewMode("grid")}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        className={`toggle-btn ${productViewMode === "list" ? "active" : ""}`}
                        onClick={() => setProductViewMode("list")}
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>
            <input
                type="file"
                accept=".csv"
                ref={productFileInputRef}
                hidden
                onChange={handleProductCSVImport}
            />
            <div style={{ display: "flex", gap: "1rem" }}>
                <button
                    className="btn-primary-ht"
                    onClick={() => productFileInputRef.current?.click()}
                >
                    <FileUp size={18} />
                    <span>{invT.importCSV}</span>
                </button>
                <button className="btn-primary-ht" onClick={onAddProduct}>
                    <Plus size={18} />
                    <span>{invT.defineProduct}</span>
                </button>
            </div>
        </div>
        {products.length > 0 || isLoading ? (
            <ProductCatalog
                products={products.filter((p) =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
                )}
                viewMode={productViewMode}
                onDeleteProduct={onDeleteProduct}
                onEditProduct={(p) => onEditProduct(p)}
                isLoading={isLoading}
            />
        ) : (
            <div className="empty-state-ht">{invT.emptyProducts}</div>
        )}
    </Tabs.Content>
);
