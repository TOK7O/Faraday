import React, { useState, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Tabs from "@radix-ui/react-tabs";
import { Plus, Grid3X3, FileUp, X, Search, LayoutGrid, List, AlertTriangle, ImagePlusIcon } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

import type { Rack, Product } from "@components/layouts/dashboard/inventory/InventoryContent.types";
import { RackCard } from "@components/layouts/dashboard/inventory/RackCard";
import { ProductCatalog } from "@components/layouts/dashboard/inventory/ProductCatalog";

import "./InventoryContent.scss";

const InventoryContent = () => {
    const { t } = useTranslation();
    const invT = t.dashboardPage.content.inventory;

    const [racks, setRacks] = useState<Rack[]>([
        { id: "R-01", m: 5, n: 10, tempMin: 0, tempMax: 5, maxWeight: 1200, maxWidth: 200, maxHeight: 300, maxDepth: 500, comment: "Regał chłodniczy" },
        { id: "R-02", m: 4, n: 8, tempMin: 0, tempMax: 40, maxWeight: 800, maxWidth: 150, maxHeight: 250, maxDepth: 400, comment: "Regał standardowy" }
    ]);

    const [products, setProducts] = useState<Product[]>([
        { id: "P-101", name: "Aceton Techniczny", category: "Chemikalia", weight: 5, width: 50, height: 100, depth: 50, tempRequired: 4, isHazardous: true },
        { id: "P-102", name: "Moduł CPU X1", category: "Elektronika", weight: 0.5, width: 20, height: 10, depth: 20, tempRequired: 20, isHazardous: false }
    ]);

    const [searchQuery, setSearchQuery] = useState("");
    const [productViewMode, setProductViewMode] = useState<'grid' | 'list'>('grid');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingRack, setEditingRack] = useState<Rack | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const closeModal = () => {
        setIsModalOpen(false);
        setIsProductModalOpen(false);
        setEditingRack(null);
        setEditingProduct(null);
    };

    const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newId = formData.get("id") as string;

        if (products.some(p => p.id.toLowerCase() === newId.toLowerCase() && p.id !== editingProduct?.id)) {
            alert(`Błąd: Produkt o identyfikatorze "${newId}" już istnieje.`);
            return;
        }

        // Pobranie pliku obrazu
        const imageFile = formData.get("imageFile") as File;

        const productData: any = {
            id: newId,
            name: formData.get("name") as string,
            category: formData.get("category") as string || "Ogólne",
            weight: Number(formData.get("weight")),
            width: Number(formData.get("width")),
            height: Number(formData.get("height")),
            depth: Number(formData.get("depth")),
            tempMin: Number(formData.get("tempMin")),
            tempMax: Number(formData.get("tempMax")),
            expiryDays: Number(formData.get("expiryDays")),
            comment: formData.get("comment") as string,
            isHazardous: formData.get("isHazardous") === "on",
            hazardType: formData.get("hazardType") as string,

            imageFile: imageFile.size > 0 ? imageFile : null
        };

        console.log("Zapisywanie produktu z plikiem:", productData);

        if (editingProduct) {
            setProducts(prev => prev.map(p => p.id === editingProduct.id ? productData : p));
        } else {
            setProducts(prev => [...prev, productData]);
        }
        closeModal();
    };
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
        event.target.value = "";
    };

    const handleDeleteRack = (id: string) => {
        if (window.confirm(invT.deleteConfirm.replace("{id}", id))) {
            setRacks(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleSaveRack = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newId = formData.get("id") as string;
        if (racks.some(r => r.id.toLowerCase() === newId.toLowerCase() && r.id !== editingRack?.id)) {
            alert(`Błąd: Regał "${newId}" już istnieje.`);
            return;
        }
        const rackData: Rack = {
            id: newId,
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
        if (editingRack) setRacks(prev => prev.map(r => r.id === editingRack.id ? rackData : r));
        else setRacks(prev => [...prev, rackData]);
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
                                <span>{invT.managementCenter}</span>
                            </div>
                            <h1>Inventory <span className="outline-text">Hub</span></h1>
                            <Tabs.List className="ht-tabs-list" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                                <Tabs.Trigger value="racks" className="ht-tabs-trigger">{invT.racksStructure}</Tabs.Trigger>
                                <Tabs.Trigger value="products" className="ht-tabs-trigger">{invT.productCatalog}</Tabs.Trigger>
                            </Tabs.List>
                        </div>
                    </header>

                    <Tabs.Content value="racks">
                        <div className="action-bar" style={{ justifyContent: 'flex-start', gap: '1rem' }}>
                            <input type="file" accept=".csv" ref={fileInputRef} hidden onChange={handleCSVImport} />
                            <button className="btn-primary-ht" onClick={() => fileInputRef.current?.click()}>
                                <FileUp size={18} /><span>{invT.importCSV}</span>
                            </button>

                            <Dialog.Root open={isModalOpen} onOpenChange={(o) => !o && closeModal()}>
                                <Dialog.Trigger asChild>
                                    <button className="btn-primary-ht" onClick={() => setIsModalOpen(true)}>
                                        <Plus size={18} /><span>{invT.addRack}</span>
                                    </button>
                                </Dialog.Trigger>
                                <Dialog.Portal>
                                    <Dialog.Overlay className="dialog-overlay-ht" />
                                    <Dialog.Content className="dialog-content-ht">
                                        <div className="modal-accent-line" />
                                        <div className="modal-header">
                                            <Dialog.Title><h2>{editingRack ? invT.editRack : invT.newRack}</h2></Dialog.Title>
                                            <Dialog.Close asChild><button className="btn-close"><X size={24} /></button></Dialog.Close>
                                        </div>
                                        <form key={editingRack ? editingRack.id : "new-rack"} className="ht-form" onSubmit={handleSaveRack}>
                                            <div className="input-row">
                                                <div className="input-group">
                                                    <label>{invT.idLabel}</label>
                                                    <input name="id" defaultValue={editingRack?.id} required />
                                                </div>
                                                <div className="input-group">
                                                    <label>{invT.sectionDescription}</label>
                                                    <input name="comment" defaultValue={editingRack?.comment} />
                                                </div>
                                            </div>
                                            <div className="input-row">
                                                <div className="input-group"><label>Rzędy (M)</label><input type="number" name="m" defaultValue={editingRack?.m} required /></div>
                                                <div className="input-group"><label>Kolumny (N)</label><input type="number" name="n" defaultValue={editingRack?.n} required /></div>
                                                <div className="input-group"><label>Max Waga [kg]</label><input type="number" name="maxWeight" defaultValue={editingRack?.maxWeight} required /></div>
                                            </div>
                                            <div className="input-row">
                                                <div className="input-group">
                                                    <label>Temp (Min/Max)</label>
                                                    <div className="multi-input" style={{ display: 'flex', gap: '8px' }}>
                                                        <input type="number" name="tempMin" defaultValue={editingRack?.tempMin} placeholder="Min" required />
                                                        <input type="number" name="tempMax" defaultValue={editingRack?.tempMax} placeholder="Max" required />
                                                    </div>
                                                </div>
                                                <div className="input-group">
                                                    <label>Wymiary slotu [mm]</label>
                                                    <div className="multi-input" style={{ display: 'flex', gap: '4px' }}>
                                                        <input type="number" name="maxWidth" defaultValue={editingRack?.maxWidth} placeholder="X" required />
                                                        <input type="number" name="maxHeight" defaultValue={editingRack?.maxHeight} placeholder="Y" required />
                                                        <input type="number" name="maxDepth" defaultValue={editingRack?.maxDepth} placeholder="Z" required />
                                                    </div>
                                                </div>
                                            </div>
                                            <button type="submit" className="btn-submit-ht">{invT.confirmChanges}</button>
                                        </form>
                                    </Dialog.Content>
                                </Dialog.Portal>
                            </Dialog.Root>
                        </div>
                        <div className="stats-grid">
                            {racks.map((rack) => (
                                <RackCard key={rack.id} rack={rack} onEdit={(r) => { setEditingRack(r); setIsModalOpen(true); }} onDelete={handleDeleteRack} />
                            ))}
                        </div>
                    </Tabs.Content>

                    <Tabs.Content value="products">
                        <div className="action-bar">
                            <div className="search-container">
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={18} className="search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                    <input
                                        type="text"
                                        placeholder={invT.searchProduct}
                                        style={{ paddingLeft: '40px', width: '100%', maxWidth: '300px' }}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="view-mode-toggle">
                                    <button className={`toggle-btn ${productViewMode === 'grid' ? 'active' : ''}`} onClick={() => setProductViewMode('grid')}><LayoutGrid size={18} /></button>
                                    <button className={`toggle-btn ${productViewMode === 'list' ? 'active' : ''}`} onClick={() => setProductViewMode('list')}><List size={18} /></button>
                                </div>
                            </div>

                            <Dialog.Root open={isProductModalOpen} onOpenChange={(o) => !o && closeModal()}>
                                <Dialog.Trigger asChild>
                                    <button className="btn-primary-ht" onClick={() => setIsProductModalOpen(true)}>
                                        <Plus size={18} /><span>{invT.defineProduct}</span>
                                    </button>
                                </Dialog.Trigger>
                                <Dialog.Portal>
                                    <Dialog.Overlay className="dialog-overlay-ht" />
                                    <Dialog.Content className="dialog-content-ht product-modal">
                                        <div className="modal-accent-line" style={{ background: 'var(--accent-secondary)' }} />
                                        <div className="modal-header">
                                            <Dialog.Title><h2>Definiowanie asortymentu</h2></Dialog.Title>
                                            <Dialog.Close asChild><button className="btn-close"><X size={24} /></button></Dialog.Close>
                                        </div>

                                        <form className="ht-form" onSubmit={handleSaveProduct} encType="multipart/form-data">
                                            <div className="input-row">
                                                <div className="input-group">
                                                    <label>Nazwa asortymentu</label>
                                                    <input name="name" placeholder="np. Aceton Techniczny" required />
                                                </div>
                                                <div className="input-group">
                                                    <label>Identyfikator (Kod kreskowy/QR)</label>
                                                    <input name="id" placeholder="Skanuj lub wpisz kod" required />
                                                </div>
                                            </div>

                                            <div className="input-row">
                                                <div className="input-group">
                                                    <label>Zdjęcie produktu (Plik)</label>
                                                    <div className="file-input-wrapper" style={{ position: 'relative' }}>
                                                        <ImagePlusIcon size={18} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.5 }} />
                                                        <input
                                                            type="file"
                                                            name="imageFile"
                                                            accept="image/*"
                                                            style={{ paddingLeft: '40px' }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="input-group">
                                                    <label>Kategoria</label>
                                                    <input name="category" placeholder="np. Chemikalia" />
                                                </div>
                                            </div>

                                            <div className="input-row">
                                                <div className="input-group">
                                                    <label>Zakres temperatury [°C]</label>
                                                    <div className="multi-input" style={{ display: 'flex', gap: '8px' }}>
                                                        <input type="number" name="tempMin" placeholder="Min" required />
                                                        <input type="number" name="tempMax" placeholder="Max" required />
                                                    </div>
                                                </div>
                                                <div className="input-group">
                                                    <label>Waga [kg]</label>
                                                    <input type="number" step="0.01" name="weight" required />
                                                </div>
                                            </div>

                                            <div className="input-row">
                                                <div className="input-group">
                                                    <label>Wymiary [XxYxZ mm]</label>
                                                    <div className="multi-input" style={{ display: 'flex', gap: '4px' }}>
                                                        <input type="number" name="width" placeholder="X" required />
                                                        <input type="number" name="height" placeholder="Y" required />
                                                        <input type="number" name="depth" placeholder="Z" required />
                                                    </div>
                                                </div>
                                                <div className="input-group">
                                                    <label>Termin ważności [dni]</label>
                                                    <input type="number" name="expiryDays" placeholder="Dni od przyjęcia" required />
                                                </div>
                                            </div>

                                            <div className="input-row">
                                                <div className="input-group" style={{ flex: 2 }}>
                                                    <label>Komentarz</label>
                                                    <input name="comment" placeholder="Dodatkowe informacje..." />
                                                </div>
                                                <div className="input-group" style={{ flex: 1 }}>
                                                    <label>Typ zagrożenia</label>
                                                    <select name="hazardType" className="ht-select" style={{ height: '42px', background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'white', borderRadius: '8px', padding: '0 10px' }}>
                                                        <option value="none">Brak</option>
                                                        <option value="explosive">Wybuchowy</option>
                                                        <option value="flammable">Łatwopalny</option>
                                                        <option value="toxic">Toksyczny</option>
                                                        <option value="corrosive">Żrący</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
                                                <input type="checkbox" id="hazardous" name="isHazardous" className="ht-checkbox" />
                                                <label htmlFor="hazardous" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                                    <AlertTriangle size={16} color="#ffa500" />
                                                    Potwierdzam asortyment ADR
                                                </label>
                                            </div>

                                            <button type="submit" className="btn-submit-ht" style={{ background: 'var(--accent-secondary)' }}>
                                                Zapisz w systemie
                                            </button>
                                        </form>
                                    </Dialog.Content>
                                </Dialog.Portal>
                            </Dialog.Root>
                        </div>

                        <ProductCatalog products={filteredProducts} viewMode={productViewMode} />
                    </Tabs.Content>
                </Tabs.Root>
            </div>
        </Tooltip.Provider>
    );
};

export default InventoryContent;