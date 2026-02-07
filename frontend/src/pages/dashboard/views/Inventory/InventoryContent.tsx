import React, { useState, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Tabs from "@radix-ui/react-tabs";
import { Plus, Grid3X3, FileUp, X, Search, LayoutGrid, List } from "lucide-react";

import type { Rack, Product } from "@components/layouts/dashboard/inventory/InventoryContent.types";
import { RackCard } from "@components/layouts/dashboard/inventory/RackCard";
import { ProductCatalog } from "@components/layouts/dashboard/inventory/ProductCatalog";
import "../Personnel/PersonnelContent.scss";

const InventoryContent = () => {
    const [racks, setRacks] = useState<Rack[]>([
        { id: "R-01", m: 5, n: 10, tempMin: 0, tempMax: 5, maxWeight: 1200, maxWidth: 200, maxHeight: 300, maxDepth: 500, comment: "Regał chłodniczy" },
        { id: "R-02", m: 4, n: 8, tempMin: 0, tempMax: 40, maxWeight: 800, maxWidth: 150, maxHeight: 250, maxDepth: 400, comment: "Regał standardowy" }
    ]);

    const [products, setProducts] = useState<Product[]>([
        { id: "P-101", name: "Aceton Techniczny", category: "Chemikalia", weight: 5, width: 50, height: 100, depth: 50, tempRequired: 4, isHazardous: true },
        { id: "P-102", name: "Moduł CPU X1", category: "Elektronika", weight: 0.5, width: 20, height: 10, depth: 20, tempRequired: 20, isHazardous: false },
        { id: "P-103", name: "Smar Silikonowy", category: "Utrzymanie", weight: 0.8, width: 30, height: 150, depth: 30, tempRequired: 15, isHazardous: false }
    ]);

    const [productViewMode, setProductViewMode] = useState<'grid' | 'list'>('grid');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingRack, setEditingRack] = useState<Rack | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const closeModal = () => {
        setIsModalOpen(false);
        setIsProductModalOpen(false);
        setEditingRack(null);
    };

    // --- LOGIKA: IMPORT CSV ---
    const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split("\n");
            const newRacks: Rack[] = lines
                .filter(line => line.trim() && !line.startsWith("#"))
                .map(line => {
                    const [id, m, n, tMin, tMax, weight, w, h, d, comment] = line.split(";");
                    return {
                        id: id?.trim() || `R-${Math.random().toString(36).substr(2, 4)}`,
                        m: parseInt(m) || 1,
                        n: parseInt(n) || 1,
                        tempMin: parseInt(tMin) || 0,
                        tempMax: parseInt(tMax) || 25,
                        maxWeight: parseInt(weight) || 1000,
                        maxWidth: parseInt(w) || 100,
                        maxHeight: parseInt(h) || 100,
                        maxDepth: parseInt(d) || 100,
                        comment: comment?.trim() || ""
                    };
                });

            setRacks(prev => [...prev, ...newRacks]);
        };
        reader.readAsText(file);
        event.target.value = ""; // Reset inputa
    };

    // --- LOGIKA: USUWANIE ---
    const handleDeleteRack = (id: string) => {
        if (window.confirm(`Czy na pewno chcesz usunąć regał ${id}?`)) {
            setRacks(prev => prev.filter(r => r.id !== id));
        }
    };

    // --- LOGIKA: ZAPIS (DODAJ/EDYTUJ) ---
    const handleSaveRack = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const rackData: Rack = {
            id: formData.get("id") as string,
            m: Number(formData.get("m")),
            n: Number(formData.get("n")),
            tempMin: Number(formData.get("tempMin")),
            tempMax: Number(formData.get("tempMax")),
            maxWeight: Number(formData.get("maxWeight")),
            maxWidth: Number(formData.get("maxWidth")),
            maxHeight: Number(formData.get("maxHeight")),
            maxDepth: Number(formData.get("maxDepth")),
            comment: formData.get("comment") as string,
        };

        if (editingRack) {
            setRacks(prev => prev.map(r => r.id === editingRack.id ? rackData : r));
        } else {
            setRacks(prev => [...prev, rackData]);
        }
        closeModal();
    };

    return (
        <Tooltip.Provider delayDuration={100} skipDelayDuration={0}>
            <div className="personnel-view-container">
                <Tabs.Root defaultValue="racks" className="inventory-tabs-root">
                    <header className="content-header">
                        <div className="header-brand">
                            <div className="system-tag">
                                <Grid3X3 size={14} className="icon-glow" />
                                <span>Centrum Zarządzania Magazynem</span>
                            </div>
                            <h1>Inventory <span className="outline-text">Hub</span></h1>
                            <Tabs.List className="ht-tabs-list" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                                <Tabs.Trigger value="racks" className="ht-tabs-trigger">Struktura Regałów</Tabs.Trigger>
                                <Tabs.Trigger value="products" className="ht-tabs-trigger">Katalog Produktów</Tabs.Trigger>
                            </Tabs.List>
                        </div>
                    </header>

                    <Tabs.Content value="racks">
                        <div className="action-bar" style={{ justifyContent: 'flex-start', gap: '1rem' }}>
                            <input
                                type="file"
                                accept=".csv"
                                ref={fileInputRef}
                                hidden
                                onChange={handleCSVImport}
                            />
                            <button
                                className="btn-primary-ht"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)' }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FileUp size={18} /><span>Importuj CSV</span>
                            </button>

                            <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
                                <Dialog.Trigger asChild>
                                    <button className="btn-primary-ht" onClick={() => setIsModalOpen(true)}>
                                        <Plus size={18} /><span>Dodaj Regał</span>
                                    </button>
                                </Dialog.Trigger>
                                <Dialog.Portal>
                                    <Dialog.Overlay className="dialog-overlay-ht" />
                                    <Dialog.Content className="dialog-content-ht">
                                        <div className="modal-accent-line" />
                                        <div className="modal-header">
                                            <Dialog.Title>
                                                <h2>{editingRack ? 'Edytuj Regał' : 'Nowy Regał'}</h2>
                                            </Dialog.Title>
                                            <Dialog.Close asChild>
                                                <button className="btn-close"><X size={24} /></button>
                                            </Dialog.Close>
                                        </div>

                                        <form className="ht-form" onSubmit={handleSaveRack}>
                                            <div className="input-row">
                                                <div className="input-group">
                                                    <label>ID / Oznaczenie</label>
                                                    <input name="id" defaultValue={editingRack?.id} placeholder="np. R-01" required />
                                                </div>
                                                <div className="input-group">
                                                    <label>Opis sekcji</label>
                                                    <input name="comment" defaultValue={editingRack?.comment} placeholder="np. Sektor A" />
                                                </div>
                                            </div>

                                            <div className="input-row">
                                                <div className="input-group">
                                                    <label>Rzędy (M)</label>
                                                    <input type="number" name="m" defaultValue={editingRack?.m} required />
                                                </div>
                                                <div className="input-group">
                                                    <label>Kolumny (N)</label>
                                                    <input type="number" name="n" defaultValue={editingRack?.n} required />
                                                </div>
                                                <div className="input-group">
                                                    <label>Max waga (kg)</label>
                                                    <input type="number" name="maxWeight" defaultValue={editingRack?.maxWeight} required />
                                                </div>
                                            </div>

                                            <div className="input-row">
                                                <div className="input-group">
                                                    <label>Temp. Min/Max</label>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <input type="number" name="tempMin" defaultValue={editingRack?.tempMin} placeholder="Min" required />
                                                        <input type="number" name="tempMax" defaultValue={editingRack?.tempMax} placeholder="Max" required />
                                                    </div>
                                                </div>
                                                <div className="input-group">
                                                    <label>Wymiary slotu (mm)</label>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <input type="number" name="maxWidth" defaultValue={editingRack?.maxWidth} placeholder="S" required />
                                                        <input type="number" name="maxHeight" defaultValue={editingRack?.maxHeight} placeholder="W" required />
                                                        <input type="number" name="maxDepth" defaultValue={editingRack?.maxDepth} placeholder="G" required />
                                                    </div>
                                                </div>
                                            </div>
                                            <button type="submit" className="btn-submit-ht">Zatwierdź zmiany</button>
                                        </form>
                                    </Dialog.Content>
                                </Dialog.Portal>
                            </Dialog.Root>
                        </div>

                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))' }}>
                            {racks.map((rack) => (
                                <RackCard
                                    key={rack.id}
                                    rack={rack}
                                    onEdit={(r) => { setEditingRack(r); setIsModalOpen(true); }}
                                    onDelete={handleDeleteRack}
                                />
                            ))}
                        </div>
                    </Tabs.Content>

                    <Tabs.Content value="products">
                        <div className="action-bar">
                            <div className="search-container" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={18} className="search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                    <input type="text" placeholder="Szukaj produktu..." style={{ paddingLeft: '40px', width: '100%', maxWidth: '300px' }} />
                                </div>
                                <div className="view-mode-toggle" style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '8px', padding: '4px' }}>
                                    <button className={`toggle-btn ${productViewMode === 'grid' ? 'active' : ''}`} onClick={() => setProductViewMode('grid')}><LayoutGrid size={18} /></button>
                                    <button className={`toggle-btn ${productViewMode === 'list' ? 'active' : ''}`} onClick={() => setProductViewMode('list')}><List size={18} /></button>
                                </div>
                            </div>
                            <button className="btn-primary-ht" onClick={() => setIsProductModalOpen(true)}>
                                <Plus size={18} /><span>Zdefiniuj Produkt</span>
                            </button>
                        </div>

                        <ProductCatalog products={products} viewMode={productViewMode} />
                    </Tabs.Content>
                </Tabs.Root>
            </div>
        </Tooltip.Provider>
    );
};

export default InventoryContent;