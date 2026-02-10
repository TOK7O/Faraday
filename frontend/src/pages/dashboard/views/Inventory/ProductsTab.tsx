import React from "react";
import { Search, LayoutGrid, List, FileUp, Plus } from "lucide-react";
import { ProductCatalog } from "@/components/layouts/dashboard/inventory/ProductCatalog";
import type { Product } from "@/components/layouts/dashboard/inventory/InventoryContent.types";

interface ProductsTabProps {
    invT: any;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    productViewMode: 'grid' | 'list';
    setProductViewMode: (mode: 'grid' | 'list') => void;
    products: Product[];
    isLoading: boolean;
    productFileInputRef: React.RefObject<HTMLInputElement>;
    handleProductCSVImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddProduct: () => void;
    onEditProduct: (p: Product) => void;
    onDeleteProduct: (id: number | string) => void;
}

export const ProductsTab = ({
                                invT,
                                searchQuery,
                                setSearchQuery,
                                productViewMode,
                                setProductViewMode,
                                products,
                                isLoading,
                                productFileInputRef,
                                handleProductCSVImport,
                                onAddProduct,
                                onEditProduct,
                                onDeleteProduct
                            }: ProductsTabProps) => {

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.scanCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="products-tab-container">
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
                            className={`toggle-btn ${productViewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setProductViewMode('grid')}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            className={`toggle-btn ${productViewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setProductViewMode('list')}
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

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-primary-ht" onClick={() => productFileInputRef.current?.click()}>
                        <FileUp size={18} />
                        <span>Importuj CSV</span>
                    </button>
                    <button className="btn-primary-ht" onClick={onAddProduct}>
                        <Plus size={18} />
                        <span>{invT.defineProduct}</span>
                    </button>
                </div>
            </div>

            {(products.length > 0 || isLoading) ? (
                <ProductCatalog
                    products={filteredProducts}
                    viewMode={productViewMode}
                    onDeleteProduct={onDeleteProduct}
                    onEditProduct={onEditProduct}
                    isLoading={isLoading}
                />
            ) : (
                <div className="empty-state-ht">Brak produktów w katalogu.</div>
            )}
        </div>
    );
};