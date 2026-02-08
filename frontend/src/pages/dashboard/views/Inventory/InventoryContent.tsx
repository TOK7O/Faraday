import React, { useState, useRef, useEffect } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Grid3X3, FileUp, AlertTriangle, Search, LayoutGrid, List, RefreshCw, Camera, X, PackagePlus, Copy, Trash2, Ban } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { Html5QrcodeScanner } from "html5-qrcode";

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

    // stany dla obslugi csv
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [csvBuffer, setCsvBuffer] = useState<any[]>([]);
    const [conflictingCodes, setConflictingCodes] = useState<string[]>([]);

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [inboundBarcode, setInboundBarcode] = useState("");
    const [inboundResult, setInboundResult] = useState<any>(null);

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
                    id: r.id, code: r.code, m: r.rows, n: r.columns, tempMin: r.minTemperature, tempMax: r.maxTemperature,
                    maxWeight: r.maxWeightKg, maxWidth: r.maxItemWidthMm, maxHeight: r.maxItemHeightMm, maxDepth: r.maxItemDepthMm, comment: r.comment
                })));
            }
            if (pR.ok) {
                const data = await pR.json();
                setProducts(data.map((p: any) => ({
                    id: p.id, scanCode: p.scanCode, name: p.name, category: p.isHazardous ? "ADR" : "Standard",
                    weight: p.weightKg, width: p.widthMm, height: p.heightMm, depth: p.depthMm,
                    tempRequired: (p.requiredMinTemp + p.requiredMaxTemp) / 2, isHazardous: p.isHazardous
                })));
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // csv import

    const getSmallestAvailableCode = (currentRacks: Rack[], basePrefix: string = "R-") => {
        const codes = currentRacks.map(r => r.code);
        let i = 1;
        while (true) {
            const candidate = `${basePrefix}${i.toString().padStart(2, '0')}`;
            if (!codes.includes(candidate)) return candidate;
            i++;
        }
    };

    const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split("\n");
            const buffer: any[] = [];
            const conflicts: string[] = [];

            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("#")) return;
                const [code, rows, cols, tMin, tMax, w, wi, h, d, c] = trimmed.split(";");
                const rackDto = { code: code?.trim(), rows: Number(rows), columns: Number(cols), minTemperature: Number(tMin), maxTemperature: Number(tMax), maxWeightKg: Number(w), maxItemWidthMm: Number(wi), maxItemHeightMm: Number(h), maxItemDepthMm: Number(d), comment: c?.trim() || "" };

                buffer.push(rackDto);
                if (racks.some(r => r.code === rackDto.code)) {
                    conflicts.push(rackDto.code);
                }
            });

            if (conflicts.length > 0) {
                setCsvBuffer(buffer);
                setConflictingCodes(conflicts);
                setIsConflictModalOpen(true);
            } else {
                await processImport(buffer, 'NONE');
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const processImport = async (data: any[], strategy: 'OVERWRITE' | 'RENAME' | 'NONE') => {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        const currentRacks = [...racks];

        for (const item of data) {
            const existing = currentRacks.find(r => r.code === item.code);
            let method = "POST";
            let url = `${API_BASE_URL}/api/Rack`;
            let body = { ...item };

            if (existing) {
                if (strategy === 'OVERWRITE') {
                    method = "PUT";
                    url = `${API_BASE_URL}/api/Rack/${existing.id}`;
                } else if (strategy === 'RENAME') {
                    body.code = getSmallestAvailableCode(currentRacks);
                    // Dodajemy do listy, żeby kolejny element z CSV nie dostał tego samego kodu
                    currentRacks.push({ ...existing, code: body.code });
                } else {
                    continue; // Pomiń jeśli wystąpił konflikt a strategia to NONE (anulowanie)
                }
            }

            try {
                await fetch(url, {
                    method,
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
            } catch (err) { console.error(err); }
        }
        setIsConflictModalOpen(false);
        fetchData();
    };

    // scanner
    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;
        if (isScannerOpen) {
            scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
            scanner.render((decodedText) => {
                setInboundBarcode(decodedText);
                setIsScannerOpen(false);
                scanner?.clear();
            }, (error) => { /* ignoruj błędy skanowania */ });
        }
        return () => { scanner?.clear(); };
    }, [isScannerOpen]);

    const handleInbound = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/api/Operation/inbound`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ barcode: inboundBarcode })
            });
            const data = await res.json();
            setInboundResult({
                ...data,
                time: new Date().toLocaleTimeString(),
                user: localStorage.getItem("username") || "Operator"
            });
            if (data.success) {
                setInboundBarcode("");
                fetchData();
            }
        } catch (e) { console.error(e); }
    };

    const handleDeleteRack = async (id: number | string) => {
        if (!window.confirm(t.dashboardPage.content.inventory.deleteConfirm?.replace("{id}", id.toString()) || "Czy na pewno chcesz usunąć ten regał?")) return;
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/api/Rack/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) fetchData();
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
            if (res.ok) fetchData();
        } catch (e) { console.error(e); }
    };

    const handleOpenAddRackModal = () => { setEditingRack(null); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setIsProductModalOpen(false); setEditingRack(null); setEditingProduct(null); };

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
        const url = editingProduct ? `${API_BASE_URL}/api/Product/${editingProduct.id}` : `${API_BASE_URL}/api/Product`;
        const res = await fetch(url, { method, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(dto) });
        if (res.ok) { fetchData(); closeModal(); }
    };

    const handleSaveRack = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const token = localStorage.getItem("token");
        const code = f.get("code")?.toString();
        const dto = {
            code: code,
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
        const url = editingRack ? `${API_BASE_URL}/api/Rack/${editingRack.id}` : `${API_BASE_URL}/api/Rack`;
        const res = await fetch(url, { method, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(dto) });
        if (res.ok) { fetchData(); closeModal(); }
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
                                    <Tabs.Trigger value="inbounds" className="ht-tabs-trigger">Przyjęcia</Tabs.Trigger>
                                </Tabs.List>
                                <button onClick={fetchData} className="btn-action-ht">
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
                        {isLoading ? <div className="loading-state">Syncing...</div> : (
                            <div className="stats-grid">
                                {racks.map(r => <RackCard key={r.id} rack={r} onEdit={(rack) => { setEditingRack(rack); setIsModalOpen(true); }} onDelete={() => handleDeleteRack(r.id)} />)}
                            </div>
                        )}
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
                            <ProductCatalog products={products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))} viewMode={productViewMode} onDeleteProduct={handleDeleteProduct} />
                        ) : <div className="empty-state-ht">Brak produktów.</div>}
                    </Tabs.Content>

                    <Tabs.Content value="inbounds">
                        <div className="glass-card" style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem' }}>
                            <h2><PackagePlus size={24} /> Przyjmowanie asortymentu</h2>
                            <form onSubmit={handleInbound} className="ht-form" style={{ marginTop: '1.5rem' }}>
                                <div className="input-group">
                                    <label>Zeskanuj lub wpisz kod produktu</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input value={inboundBarcode} onChange={(e) => setInboundBarcode(e.target.value)} placeholder="Kod kreskowy..." style={{ flex: 1 }} />
                                        <button type="button" onClick={() => setIsScannerOpen(true)} className="btn-action-ht"><Camera size={20} /></button>
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary-ht" style={{ marginTop: '1rem', width: '100%' }}>Przyjmij do magazynu</button>
                            </form>
                            {isScannerOpen && (
                                <div className="scanner-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div id="reader" style={{ width: '100%', maxWidth: '500px' }}></div>
                                    <button onClick={() => setIsScannerOpen(false)} className="btn-close" style={{ marginTop: '2rem', color: '#fff' }}><X size={32} /></button>
                                </div>
                            )}
                        </div>
                    </Tabs.Content>
                </Tabs.Root>
            </div>

            <Dialog.Root open={isConflictModalOpen} onOpenChange={setIsConflictModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay-ht" />
                    <Dialog.Content className="dialog-content-ht" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <Dialog.Title><h2>Konflikt oznaczeń</h2></Dialog.Title>
                        </div>
                        <div style={{ margin: '1.5rem 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ff4d4d', marginBottom: '1rem' }}>
                                <AlertTriangle size={24} />
                                <strong>Wykryto powtarzające się kody regałów!</strong>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                Następujące kody już istnieją w bazie: <br />
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{conflictingCodes.join(', ')}</span>
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button className="btn-primary-ht" onClick={() => processImport(csvBuffer, 'OVERWRITE')}>
                                <Trash2 size={16} /> Nadpisz istniejące regały
                            </button>
                            <button className="btn-primary-ht" onClick={() => processImport(csvBuffer, 'RENAME')}>
                                <Copy size={16} /> Zmień nazwy na wolne (np. {getSmallestAvailableCode(racks)})
                            </button>
                            <button className="btn-action-ht" onClick={() => setIsConflictModalOpen(false)} style={{ color: '#ff4d4d' }}>
                                <Ban size={16} /> Anuluj operację
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <RackModal open={isModalOpen} onOpenChange={setIsModalOpen} editingRack={editingRack} onSave={handleSaveRack} invT={invT} existingRacks={racks}/>
            <ProductModal open={isProductModalOpen} onOpenChange={setIsProductModalOpen} onSave={handleSaveProduct} />
        </Tooltip.Provider>
    );
};

export default InventoryContent;