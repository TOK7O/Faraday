import React, { useState, useRef, useEffect } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Tabs from "@radix-ui/react-tabs";
import { Plus, Grid3X3, FileUp, Search, LayoutGrid, List, RefreshCw } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

import type { Rack, Product } from "@components/layouts/dashboard/inventory/InventoryContent.types";
import { RackCard } from "@components/layouts/dashboard/inventory/RackCard";
import { ProductCatalog } from "@components/layouts/dashboard/inventory/ProductCatalog";
import { RackModal } from "@components/layouts/dashboard/inventory/RackModal";
import { ProductModal } from "@components/layouts/dashboard/inventory/ProductModal";

import "./InventoryContent.scss";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

const InventoryContent = () => {
    const { t } = useTranslation();
    const invT = t.dashboardPage.content.inventory;

    const [racks, setRacks] = useState<Rack[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [productViewMode, setProductViewMode] = useState<'grid' | 'list'>('grid');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingRack, setEditingRack] = useState<Rack | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
        try {
            const [rR, pR] = await Promise.all([
                fetch(`${API_BASE_URL}/api/Rack`, { headers }),
                fetch(`${API_BASE_URL}/api/Product`, { headers })
            ]);
            if (rR.ok) {
                const data = await rR.json();
                setRacks(data.map((r: any) => ({
                    id: r.id,
                    code: r.code,
                    m: r.rows,
                    n: r.columns,
                    tempMin: r.minTemperature,
                    tempMax: r.maxTemperature,
                    maxWeight: r.maxWeightKg,
                    maxWidth: r.maxItemWidthMm,
                    maxHeight: r.maxItemHeightMm,
                    maxDepth: r.maxItemDepthMm,
                    comment: r.comment
                })));
            }
            if (pR.ok) {
                const data = await pR.json();
                setProducts(data.map((p: any) => ({
                    id: p.id,
                    scanCode: p.scanCode,
                    name: p.name,
                    category: p.isHazardous ? "ADR" : "Standard",
                    weight: p.weightKg,
                    width: p.widthMm,
                    height: p.heightMm,
                    depth: p.depthMm,
                    tempRequired: (p.requiredMinTemp + p.requiredMaxTemp) / 2,
                    isHazardous: p.isHazardous
                })));
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // --- FUNKCJE USUWANIA ---

    const handleDeleteRack = async (id: number | string) => {
        if (!window.confirm(t.dashboardPage.content.inventory.deleteConfirm?.replace("{id}", id.toString()) || "Czy na pewno chcesz usunąć ten regał?")) return;

        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/api/Rack/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                fetchData();
            } else {
                alert("Nie można usunąć regału. Może zawierać produkty.");
            }
        } catch (e) { console.error(e); }
    };

    const handleDeleteProduct = async (id: number | string) => {
        if (!window.confirm("Czy na pewno chcesz usunąć ten produkt z katalogu?")) return;

        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/api/Product/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                fetchData();
            } else {
                alert("Błąd podczas usuwania produktu.");
            }
        } catch (e) { console.error(e); }
    };

    // --- RESZTA LOGIKI ---

    const handleOpenAddRackModal = () => {
        setEditingRack(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsProductModalOpen(false);
        setEditingRack(null);
        setEditingProduct(null);
    };

    const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const token = localStorage.getItem("token");

        const dto = {
            scanCode: f.get("scanCode"),
            name: f.get("name"),
            photoUrl: f.get("photoUrl") || null,
            weightKg: Number(f.get("weightKg")),
            widthMm: Number(f.get("widthMm")),
            heightMm: Number(f.get("heightMm")),
            depthMm: Number(f.get("depthMm")),
            requiredMinTemp: Number(f.get("requiredMinTemp")),
            requiredMaxTemp: Number(f.get("requiredMaxTemp")),
            isHazardous: f.get("isHazardous") === "on",
            hazardClassification: Number(f.get("hazardClassification")),
            validityDays: f.get("validityDays") ? Number(f.get("validityDays")) : null,
            comment: f.get("comment")
        };

        const method = editingProduct ? "PUT" : "POST";
        const url = editingProduct
            ? `${API_BASE_URL}/api/Product/${editingProduct.id}`
            : `${API_BASE_URL}/api/Product`;

        const res = await fetch(url, {
            method,
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(dto)
        });

        if (res.ok) { fetchData(); closeModal(); }
    };

    const handleSaveRack = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const token = localStorage.getItem("token");

        const dto = {
            code: f.get("code"),
            rows: editingRack ? undefined : Number(f.get("rows")),
            columns: editingRack ? undefined : Number(f.get("columns")),
            minTemperature: Number(f.get("minTemperature")),
            maxTemperature: Number(f.get("maxTemperature")),
            maxWeightKg: Number(f.get("maxWeightKg")),
            maxItemWidthMm: Number(f.get("maxItemWidthMm")),
            maxItemHeightMm: Number(f.get("maxItemHeightMm")),
            maxItemDepthMm: Number(f.get("maxItemDepthMm")),
            comment: f.get("comment")
        };

        const method = editingRack ? "PUT" : "POST";
        const url = editingRack
            ? `${API_BASE_URL}/api/Rack/${editingRack.id}`
            : `${API_BASE_URL}/api/Rack`;

        const res = await fetch(url, {
            method,
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(dto)
        });

        if (res.ok) { fetchData(); closeModal(); }
    };

    const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split("\n");
            const token = localStorage.getItem("token");

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith("#")) continue;

                const [code, rows, columns, tMin, tMax, weight, width, height, depth, comment] = trimmedLine.split(";");
                const dto = {
                    code: code?.trim(),
                    rows: Number(rows),
                    columns: Number(columns),
                    minTemperature: Number(tMin),
                    maxTemperature: Number(tMax),
                    maxWeightKg: Number(weight),
                    maxItemWidthMm: Number(width),
                    maxItemHeightMm: Number(height),
                    maxItemDepthMm: Number(depth),
                    comment: comment?.trim() || ""
                };

                try {
                    await fetch(`${API_BASE_URL}/api/Rack`, {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                        body: JSON.stringify(dto)
                    });
                } catch (err) { console.error(err); }
            }
            fetchData();
            alert("Import zakończony.");
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    return (
        <Tooltip.Provider delayDuration={100} skipDelayDuration={0}>
            <div className="personnel-view-container">
                <Tabs.Root defaultValue="racks" className="inventory-tabs-root">
                    <header className="content-header">
                        <div className="header-brand">
                            <div className="system-tag"><Grid3X3 size={14} className="icon-glow" /><span>{invT.managementCenter}</span></div>
                            <h1>Inventory <span className="outline-text">Hub</span></h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <Tabs.List className="ht-tabs-list" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                                    <Tabs.Trigger value="racks" className="ht-tabs-trigger">{invT.racksStructure}</Tabs.Trigger>
                                    <Tabs.Trigger value="products" className="ht-tabs-trigger">{invT.productCatalog}</Tabs.Trigger>
                                </Tabs.List>
                                <button onClick={fetchData} className="btn-action-ht" style={{ marginTop: '1rem' }}>
                                    <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                                </button>
                            </div>
                        </div>
                    </header>

                    <Tabs.Content value="racks">
                        <div className="action-bar" style={{ justifyContent: 'flex-start', gap: '1rem' }}>
                            <input type="file" accept=".csv" ref={fileInputRef} hidden onChange={handleCSVImport} />
                            <button className="btn-primary-ht" onClick={() => fileInputRef.current?.click()}><FileUp size={18} /><span>{invT.importCSV}</span></button>
                            <button className="btn-primary-ht" onClick={handleOpenAddRackModal}>
                                <Plus size={18} /><span>{invT.addRack}</span>
                            </button>
                        </div>
                        {isLoading ? <div className="loading-state">Syncing...</div> : racks.length > 0 ? (
                            <div className="stats-grid">
                                {racks.map(r => (
                                    <RackCard
                                        key={r.id}
                                        rack={r}
                                        onEdit={(rack) => { setEditingRack(rack); setIsModalOpen(true); }}
                                        onDelete={() => handleDeleteRack(r.id)} // Przekazujemy funkcję usuwania
                                    />
                                ))}
                            </div>
                        ) : <div className="empty-state-ht">Brak regałów.</div>}
                    </Tabs.Content>

                    <Tabs.Content value="products">
                        <div className="action-bar">
                            <div className="search-container">
                                <Search size={18} className="search-icon" />
                                <input type="text" placeholder={invT.searchProduct} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                <div className="view-mode-toggle">
                                    <button className={`toggle-btn ${productViewMode === 'grid' ? 'active' : ''}`} onClick={() => setProductViewMode('grid')}><LayoutGrid size={18} /></button>
                                    <button className={`toggle-btn ${productViewMode === 'list' ? 'active' : ''}`} onClick={() => setProductViewMode('list')}><List size={18} /></button>
                                </div>
                            </div>
                            <button className="btn-primary-ht" onClick={() => setIsProductModalOpen(true)}>
                                <Plus size={18} /><span>{invT.defineProduct}</span>
                            </button>
                        </div>
                        {!isLoading && products.length > 0 ? (
                            <ProductCatalog
                                products={products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                                viewMode={productViewMode}
                                onDeleteProduct={handleDeleteProduct} // Przekazujemy funkcję usuwania do katalogu
                            />
                        ) : <div className="empty-state-ht">Brak produktów.</div>}
                    </Tabs.Content>
                </Tabs.Root>
            </div>

            <RackModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                editingRack={editingRack}
                onSave={handleSaveRack}
                invT={invT}
            />
            <ProductModal
                open={isProductModalOpen}
                onOpenChange={setIsProductModalOpen}
                onSave={handleSaveProduct}
            />
        </Tooltip.Provider>
    );
};

export default InventoryContent;