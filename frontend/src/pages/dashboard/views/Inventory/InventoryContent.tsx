import React, { useState, useRef, useEffect } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Grid3X3, FileUp, AlertTriangle, Search, LayoutGrid, List, RefreshCw, Camera, CheckCircle2, MapPin, PackagePlus, Box, Trash2, Copy, Ban, Move, PackageMinus, X } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { Html5QrcodeScanner } from "html5-qrcode";

import type { Rack, Product, FullInventoryItem } from "@/components/layouts/dashboard/inventory/InventoryContent.types";
import { RackCard } from "@/components/layouts/dashboard/inventory/RackCard";
import { ProductCatalog } from "@/components/layouts/dashboard/inventory/ProductCatalog";
import { RackModal } from "@/components/layouts/dashboard/inventory/RackModal";
import { ProductModal } from "@/components/layouts/dashboard/inventory/ProductModal";
import { MoveModal } from "@/components/layouts/dashboard/inventory/MoveModal";
import { Spinner } from "@/components/ui/Spinner";
import { SkeletonGrid } from "@/components/layouts/dashboard/inventory/InventorySkeletons";

import "./InventoryContent.scss";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
const formatMessageNumbers = (msg: string) => {
    if (!msg || typeof msg !== 'string') return msg;
    return msg
        .replace(/(\.\d*[1-9])0+(?!\d)/g, '$1')
        .replace(/\.0+(?!\d)/g, '');
};

const prettifyBackendError = (rawMsg: string) => {
    if (!rawMsg) return "Nieznany błąd serwera.";
    const msg = formatMessageNumbers(rawMsg);

    // No racks found meeting requirements for 'Mleko' (Dim: 20x20x20 mm, Temp: -10 to -5°C). Check rack definitions.
    const noRacksMatch = msg.match(/No racks found meeting requirements for '(.*?)' \(Dim: (.*?) mm, Temp: (.*?)°C\)/i);
    if (noRacksMatch) {
        return (
            <div className="pretty-error">
                <p><strong>Brak pasujących regałów</strong> dla produktu <strong>{noRacksMatch[1]}</strong>.</p>
                <div className="error-specs">
                    <span>Wymiary: <strong>{noRacksMatch[2]} mm</strong></span>
                    <span>Wymagana temp: <strong>{noRacksMatch[3]}°C</strong></span>
                </div>
                <p className="error-hint">Sprawdź czy w systemie istnieją regały o takich parametrach.</p>
            </div>
        );
    }

    // No available slots found in 4 compatible racks. Racks are either full or adding this item would exceed the rack's weight limit.
    if (msg.includes("No available slots found") && msg.includes("compatible racks")) {
        return (
            <div className="pretty-error">
                <p><strong>Brak wolnego miejsca</strong> w regałach spełniających wymagania techniczne.</p>
                <p className="error-hint">Wszystkie pasujące regały są pełne lub dodanie towaru przekroczyłoby ich nośność.</p>
            </div>
        );
    }

    // Product with barcode 1 not found.
    const productNotFound = msg.match(/Product with barcode (.*?) not found/i);
    if (productNotFound) {
        return (
            <div className="pretty-error">
                <p><strong>Produkt nieznany</strong> (kod: {productNotFound[1]}).</p>
                <p className="error-hint">Dodaj produkt do katalogu asortymentu przed próbą przyjęcia.</p>
            </div>
        );
    }

    return <div className="pretty-error">{msg}</div>;
};

const InventoryContent = () => {
    const { t } = useTranslation();
    const invT = t.dashboardPage.content.inventory;

    const [racks, setRacks] = useState<Rack[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [inventoryData, setInventoryData] = useState<FullInventoryItem[]>([]);
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
    const [scannerMode, setScannerMode] = useState<'inbound' | 'outbound' | 'move'>('inbound');
    const [inboundBarcode, setInboundBarcode] = useState("");
    const [inboundResult, setInboundResult] = useState<any>(null);
    const [outboundBarcode, setOutboundBarcode] = useState("");
    const [outboundResult, setOutboundResult] = useState<any>(null);
    const [moveResult, setMoveResult] = useState<any>(null);

    const [moveBarcode, setMoveBarcode] = useState("");
    const [movingItem, setMovingItem] = useState<FullInventoryItem | null>(null);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
        try {
            const [rR, pR, iR] = await Promise.all([
                fetch(`${API_BASE_URL}/api/Rack`, { headers }),
                fetch(`${API_BASE_URL}/api/Product`, { headers }),
                fetch(`${API_BASE_URL}/api/Report/full-inventory`, { headers })
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
                    tempRequired: (p.requiredMinTemp + p.requiredMaxTemp) / 2,
                    requiredMinTemp: p.requiredMinTemp,
                    requiredMaxTemp: p.requiredMaxTemp,
                    isHazardous: p.isHazardous,
                    hazardClassification: p.hazardClassification,
                    validityDays: p.validityDays,
                    photoUrl: p.photoUrl
                })));
            }
            if (iR.ok) {
                const data = await iR.json();
                setInventoryData(data.map((item: any) => ({
                    itemId: item.itemId,
                    productId: item.productId,
                    productName: item.productName,
                    barcode: item.barcode,
                    productPhotoUrl: item.productPhotoUrl,
                    productWeightKg: item.productWeightKg,
                    rackCode: item.rackCode,
                    slotX: item.slotX,
                    slotY: item.slotY,
                    locationCode: item.locationCode,
                    status: item.status,
                    entryDate: item.entryDate,
                    expirationDate: item.expirationDate,
                    daysUntilExpiration: item.daysUntilExpiration,
                    currentRackTemperature: item.currentRackTemperature,
                    receivedByUsername: item.receivedByUsername,
                    isHazardous: item.isHazardous,
                    hazardClassification: item.hazardClassification
                })));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSlotClick = (barcode: string) => {
        setSearchQuery(barcode);
        // Switch to stock tab
        const stockTabTrigger = document.querySelector('[data-value="stock"]') as HTMLElement;
        if (stockTabTrigger) stockTabTrigger.click();
    };

    // ... existing csv import code ...

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
            scanner.render(async (decodedText) => {
                if (scannerMode === 'inbound') {
                    setInboundBarcode(decodedText);
                } else if (scannerMode === 'outbound') {
                    setOutboundBarcode(decodedText);
                } else {
                    // Move mode: find item first
                    const item = inventoryData.find(i => i.barcode === decodedText);
                    if (item) {
                        setMovingItem(item);
                        setIsMoveModalOpen(true);
                    } else {
                        setMoveResult({
                            success: false,
                            message: "Nie znaleziono produktu o tym kodzie w magazynie.",
                            timestamp: new Date().toLocaleString(),
                            operator: localStorage.getItem("username") || "Admin"
                        });
                    }
                    setIsScannerOpen(false);
                    scanner?.clear();
                    return;
                }

                setIsScannerOpen(false);
                scanner?.clear();

                const token = localStorage.getItem("token");
                const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
                const endpoint = scannerMode === 'inbound' ? "inbound" : "outbound";

                try {
                    const res = await fetch(`${API_BASE_URL}/api/Operation/${endpoint}`, {
                        method: "POST",
                        headers,
                        body: JSON.stringify({ barcode: decodedText })
                    });

                    const responseText = await res.text();
                    let responseData = null;
                    if (responseText) {
                        try {
                            responseData = JSON.parse(responseText);
                        } catch (e) {
                            console.error("Failed to parse response as JSON:", responseText);
                        }
                    }

                    const setResult = scannerMode === 'inbound' ? setInboundResult : setOutboundResult;

                    if (res.status === 409) {
                        setResult({
                            success: false,
                            message: formatMessageNumbers(responseText) || "Konflikt operacji.",
                            timestamp: new Date().toLocaleString(),
                            operator: localStorage.getItem("username") || "Admin"
                        });
                        return;
                    }

                    if (res.status === 404) {
                        setResult({
                            success: false,
                            message: "Nie znaleziono produktu lub zasobu.",
                            timestamp: new Date().toLocaleString(),
                            operator: localStorage.getItem("username") || "Admin"
                        });
                        return;
                    }

                    if (res.ok) {
                        setResult({
                            ...responseData,
                            success: true,
                            timestamp: new Date().toLocaleString(),
                            operator: localStorage.getItem("username") || "Admin"
                        });
                        fetchData();
                    } else {
                        setResult({
                            success: false,
                            message: formatMessageNumbers(responseText) || "Błąd podczas operacji.",
                            timestamp: new Date().toLocaleString(),
                            operator: localStorage.getItem("username") || "Admin"
                        });
                    }
                } catch (e) {
                    const setResult = scannerMode === 'inbound' ? setInboundResult : setOutboundResult;
                    setResult({
                        success: false,
                        message: "Błąd połączenia z serwerem.",
                        timestamp: new Date().toLocaleString(),
                        operator: localStorage.getItem("username") || "Admin"
                    });
                }
            }, (_) => { /* ignoruj błędy skanowania */ });
        }
        return () => { scanner?.clear(); };
    }, [isScannerOpen, scannerMode]);

    const handleInbound = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

        try {
            const res = await fetch(`${API_BASE_URL}/api/Operation/inbound`, {
                method: "POST",
                headers,
                body: JSON.stringify({ barcode: inboundBarcode })
            });

            const responseText = await res.text();
            let responseData = null;
            if (responseText) {
                try {
                    responseData = JSON.parse(responseText);
                } catch (e) {
                    console.error("Failed to parse response as JSON:", responseText);
                }
            }

            if (res.status === 409) {
                setInboundResult({
                    success: false,
                    message: formatMessageNumbers(responseText) || "Brak wolnego miejsca.",
                    timestamp: new Date().toLocaleString(),
                    operator: localStorage.getItem("username") || "Admin"
                });
                return;
            }

            if (res.status === 404) {
                setInboundResult({
                    success: false,
                    message: "Nie znaleziono produktu.",
                    timestamp: new Date().toLocaleString(),
                    operator: localStorage.getItem("username") || "Admin"
                });
                return;
            }

            if (res.ok) {
                setInboundResult({
                    ...responseData,
                    success: true,
                    timestamp: new Date().toLocaleString(),
                    operator: localStorage.getItem("username") || "Admin"
                });
                fetchData();
            } else {
                setInboundResult({
                    success: false,
                    message: formatMessageNumbers(responseText) || "Błąd podczas przyjmowania.",
                    timestamp: new Date().toLocaleString(),
                    operator: localStorage.getItem("username") || "Admin"
                });
            }
        } catch (e) {
            setInboundResult({
                success: false,
                message: "Błąd połączenia.",
                timestamp: new Date().toLocaleString(),
                operator: localStorage.getItem("username") || "Admin"
            });
        }
    };

    const handleOutbound = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

        try {
            const res = await fetch(`${API_BASE_URL}/api/Operation/outbound`, {
                method: "POST",
                headers,
                body: JSON.stringify({ barcode: outboundBarcode })
            });

            const responseText = await res.text();
            let responseData = null;
            if (responseText) {
                try {
                    responseData = JSON.parse(responseText);
                } catch (e) {
                    console.error("Failed to parse response as JSON:", responseText);
                }
            }

            if (res.status === 404) {
                setOutboundResult({
                    success: false,
                    message: "Nie znaleziono produktu w magazynie (nieprawidłowy kod lub produkt już wydany).",
                    timestamp: new Date().toLocaleString(),
                    operator: localStorage.getItem("username") || "Admin"
                });
                return;
            }

            if (res.ok) {
                setOutboundResult({
                    ...responseData,
                    success: true,
                    timestamp: new Date().toLocaleString(),
                    operator: localStorage.getItem("username") || "Admin"
                });
                fetchData();
            } else {
                setOutboundResult({
                    success: false,
                    message: formatMessageNumbers(responseText) || "Błąd podczas wydawania produktu.",
                    timestamp: new Date().toLocaleString(),
                    operator: localStorage.getItem("username") || "Admin"
                });
            }
        } catch (e) {
            setOutboundResult({
                success: false,
                message: "Błąd połączenia z serwerem.",
                timestamp: new Date().toLocaleString(),
                operator: localStorage.getItem("username") || "Admin"
            });
        }
    };

    const handleMoveSubmit = async (targetRackCode: string, targetSlotX: number, targetSlotY: number) => {
        if (!movingItem) return;
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

        const dto = {
            barcode: movingItem.barcode,
            sourceRackCode: movingItem.rackCode,
            sourceSlotX: movingItem.slotX,
            sourceSlotY: movingItem.slotY,
            targetRackCode,
            targetSlotX,
            targetSlotY
        };

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/Operation/move`, {
                method: "POST",
                headers,
                body: JSON.stringify(dto)
            });

            const text = await res.text();
            let responseData = null;
            if (text) {
                try {
                    responseData = JSON.parse(text);
                } catch (e) { }
            }

            if (res.ok) {
                setMoveResult({
                    ...responseData,
                    success: true,
                    timestamp: new Date().toLocaleString(),
                    operator: localStorage.getItem("username") || "Admin"
                });
                setIsMoveModalOpen(false);
                setMovingItem(null);
                fetchData();
            } else {
                setMoveResult({
                    success: false,
                    message: formatMessageNumbers(text) || "Błąd podczas przesuwania.",
                    timestamp: new Date().toLocaleString(),
                    operator: localStorage.getItem("username") || "Admin"
                });
                setIsMoveModalOpen(false);
            }
        } catch (e) {
            setMoveResult({
                success: false,
                message: "Błąd połączenia z serwerem.",
                timestamp: new Date().toLocaleString(),
                operator: localStorage.getItem("username") || "Admin"
            });
            setIsMoveModalOpen(false);
        } finally {
            setIsLoading(false);
        }
    };
    const handleDeleteRack = async (id: number | string) => {
        if (!window.confirm(t.dashboardPage.content.inventory.deleteConfirm?.replace("{id}", id.toString()) || "Czy na pewno chcesz usunąć ten regał?")) return;
        setIsLoading(true);
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/api/Rack/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                fetchData();
            } else {
                const text = await res.text();
                if (res.status === 500) {
                    alert("Nie można usunąć regału. Sprawdź, czy regał jest pusty (nie zawiera produktów).");
                } else {
                    alert(`Błąd usuwania: ${formatMessageNumbers(text) || res.statusText} `);
                }
            }
        } catch (e) {
            console.error(e);
            alert("Wystąpił błąd podczas usuwania regału.");
        } finally { setIsLoading(false); }
    };

    const handleDeleteProduct = async (id: number | string) => {
        if (!window.confirm("Czy na pewno chcesz usunąć ten produkt z katalogu?")) return;
        setIsLoading(true);
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/api/Product/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) fetchData();
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const closeModal = () => { setIsModalOpen(false); setIsProductModalOpen(false); setEditingRack(null); setEditingProduct(null); };


    const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const token = localStorage.getItem("token");
        const dto = {
            id: editingProduct ? editingProduct.id : 0,
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

        setIsLoading(true);
        try {
            const res = await fetch(url, { method, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(dto) });
            if (res.ok) {
                fetchData();
                closeModal();
            } else {
                const text = await res.text();
                if (res.status === 409) {
                    alert(`Konflikt: ${formatMessageNumbers(text) || "Kod kreskowy jest już zajęty przez inny produkt."} `);
                } else {
                    alert(`Błąd zapisu: ${formatMessageNumbers(text) || res.statusText} `);
                }
            }
        } catch (error) {
            console.error(error);
            alert("Błąd połączenia z serwerem.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveRack = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const token = localStorage.getItem("token");
        const code = f.get("code")?.toString();

        const dto: any = {
            id: editingRack ? editingRack.id : 0,
            code: code,
            comment: f.get("comment"),
            // Always send physical constraints (UI makes them readOnly when rack has items)
            minTemperature: Number(f.get("minTemperature")),
            maxTemperature: Number(f.get("maxTemperature")),
            maxWeightKg: Number(f.get("maxWeightKg")),
            maxItemWidthMm: Number(f.get("maxItemWidthMm")),
            maxItemHeightMm: Number(f.get("maxItemHeightMm")),
            maxItemDepthMm: Number(f.get("maxItemDepthMm"))
        };

        // Only include rows/columns for new racks
        if (!editingRack) {
            dto.rows = Number(f.get("rows"));
            dto.columns = Number(f.get("columns"));
        }

        const method = editingRack ? "PUT" : "POST";
        const url = editingRack ? `${API_BASE_URL}/api/Rack/${editingRack.id}` : `${API_BASE_URL}/api/Rack`;

        setIsLoading(true);
        try {
            const res = await fetch(url, { method, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(dto) });
            if (res.ok) {
                fetchData();
                closeModal();
            } else {
                const text = await res.text();
                if (res.status === 409) {
                    alert(`Błąd konfiguracji: ${formatMessageNumbers(text) || "Parametry regału nie są zgodne z przechowywanym towarem lub kod jest zajęty."} `);
                } else {
                    alert(`Błąd zapisu: ${formatMessageNumbers(text) || res.statusText} `);
                }
            }
        } catch (error) {
            console.error(error);
            alert("Błąd połączenia z serwerem.");
        } finally {
            setIsLoading(false);
        }
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
                                    <Tabs.Trigger value="stock" className="ht-tabs-trigger">Stan magazynowy</Tabs.Trigger>
                                    <Tabs.Trigger value="operations" className="ht-tabs-trigger">Operacje</Tabs.Trigger>
                                </Tabs.List>
                                <button onClick={fetchData} className="btn-action-ht" disabled={isLoading}>
                                    {isLoading ? <Spinner size={16} /> : <RefreshCw size={16} />}
                                </button>
                            </div>
                        </div>
                    </header>

                    <Tabs.Content value="racks">
                        <div className="action-bar" style={{ justifyContent: 'flex-start', gap: '1rem' }}>
                            <input type="file" accept=".csv" ref={fileInputRef} hidden onChange={handleCSVImport} />
                            <button className="btn-primary-ht" onClick={() => fileInputRef.current?.click()}><FileUp size={18} /><span>{invT.importCSV}</span></button>
                            <button className="btn-primary-ht" onClick={() => { setEditingRack(null); setIsModalOpen(true); }}>
                                <Plus size={18} /><span>{invT.addRack}</span>
                            </button>
                        </div>
                        <div className="stats-grid">
                            {racks.map(r => (
                                <RackCard
                                    key={r.id}
                                    rack={r}
                                    inventory={inventoryData.filter(i => i.rackCode === r.code)}
                                    onEdit={(rack) => { setEditingRack(rack); setIsModalOpen(true); }}
                                    onDelete={() => handleDeleteRack(r.id)}
                                    onSlotClick={handleSlotClick}
                                />
                            ))}
                            {isLoading && <SkeletonGrid count={6} type="rack" />}
                        </div>
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
                        {(products.length > 0 || isLoading) ? (
                            <ProductCatalog
                                products={products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                                viewMode={productViewMode}
                                onDeleteProduct={handleDeleteProduct}
                                onEditProduct={(p) => { setEditingProduct(p); setIsProductModalOpen(true); }}
                                isLoading={isLoading}
                            />
                        ) : <div className="empty-state-ht">Brak produktów.</div>}
                    </Tabs.Content>

                    <Tabs.Content value="stock">
                        <div className="action-bar">
                            <div className="search-container">
                                <Search size={18} className="search-icon" />
                                <input type="text" placeholder="Szukaj w magazynie (nazwa, kod, regał)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                        </div>
                        <div className="stock-grid">
                            {inventoryData
                                .filter(item =>
                                    item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    item.barcode.includes(searchQuery) ||
                                    item.rackCode.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map(item => (
                                    <div key={item.itemId} className={`glass-card stock-item-card ${item.barcode === searchQuery ? 'highlight' : ''}`}>
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
                                                onClick={() => { setMovingItem(item); setIsMoveModalOpen(true); }}
                                                title="Przesuń towar"
                                                style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                                            >
                                                <Move size={14} /> <span>Przesuń</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            {inventoryData.length === 0 && !isLoading && <div className="empty-state-ht">Magazyn jest obecnie pusty.</div>}
                        </div>
                    </Tabs.Content>

                    <Tabs.Content value="operations">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', padding: '1rem' }}>
                            {/* Przyjęcia */}
                            <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(var(--accent-primary-rgb), 0.1)' }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}>
                                        <PackagePlus size={20} color="var(--accent-primary)" />
                                        Przyjęcia
                                    </h2>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Automatyczna alokacja miejsca.
                                    </p>
                                </div>

                                <form onSubmit={(e) => { e.preventDefault(); handleInbound(e); }} className="ht-form">
                                    <div className="input-group">
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                value={inboundBarcode}
                                                onChange={(e) => setInboundBarcode(e.target.value)}
                                                placeholder="Kod produktu..."
                                                style={{ flex: 1 }}
                                            />
                                            <button type="button" onClick={() => { setScannerMode('inbound'); setIsScannerOpen(true); }} className="btn-action-ht">
                                                <Camera size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn-primary-ht" style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.85rem' }}>
                                        Przyjmij towar
                                    </button>
                                </form>

                                {inboundResult && (
                                    <div className={`operation-result-mini ${inboundResult.success ? 'success' : 'error'}`} style={{
                                        marginTop: '1rem',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        background: inboundResult.success ? 'rgba(var(--accent-primary-rgb), 0.05)' : 'rgba(255, 77, 77, 0.05)',
                                        border: `1px solid ${inboundResult.success ? 'rgba(var(--accent-primary-rgb), 0.2)' : 'rgba(255, 77, 77, 0.2)'}`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                                            {inboundResult.success ? <CheckCircle2 size={16} color="var(--accent-primary)" /> : <AlertTriangle size={16} color="#ff4d4d" />}
                                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{inboundResult.success ? "Przyjęto" : "Błąd"}</span>
                                        </div>
                                        {inboundResult.success ? (
                                            <div style={{ fontSize: '0.8rem' }}>
                                                <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{inboundResult.rackCode} [{inboundResult.slotX}, {inboundResult.slotY}]</div>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.75rem', color: '#ff4d4d' }}>{prettifyBackendError(inboundResult.message)}</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Przesunięcia */}
                            <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(var(--accent-primary-rgb), 0.1)' }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}>
                                        <Move size={20} color="var(--accent-primary)" />
                                        Przesunięcia
                                    </h2>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Relokacja między regałami.
                                    </p>
                                </div>

                                <div className="ht-form">
                                    <div className="input-group">
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                placeholder="Kod produktu do przesunięcia..."
                                                value={moveBarcode}
                                                onChange={(e) => setMoveBarcode(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const item = inventoryData.find(i => i.barcode === moveBarcode);
                                                        if (item) {
                                                            setMovingItem(item);
                                                            setIsMoveModalOpen(true);
                                                            setMoveBarcode("");
                                                        } else {
                                                            setMoveResult({ success: false, message: "Nie znaleziono produktu." });
                                                        }
                                                    }
                                                }}
                                                style={{ flex: 1 }}
                                            />
                                            <button type="button" onClick={() => { setScannerMode('move'); setIsScannerOpen(true); }} className="btn-action-ht">
                                                <Camera size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-primary-ht"
                                        style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.85rem' }}
                                        onClick={() => {
                                            const item = inventoryData.find(i => i.barcode === moveBarcode);
                                            if (item) {
                                                setMovingItem(item);
                                                setIsMoveModalOpen(true);
                                                setMoveBarcode("");
                                            } else {
                                                setMoveResult({ success: false, message: "Nie znaleziono produktu." });
                                            }
                                        }}
                                    >
                                        Inicjuj przesunięcie
                                    </button>
                                </div>

                                {moveResult && (
                                    <div className={`operation-result-mini ${moveResult.success ? 'success' : 'error'}`} style={{
                                        marginTop: '1rem',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        background: moveResult.success ? 'rgba(var(--accent-primary-rgb), 0.05)' : 'rgba(255, 77, 77, 0.05)',
                                        border: `1px solid ${moveResult.success ? 'rgba(var(--accent-primary-rgb), 0.2)' : 'rgba(255, 77, 77, 0.2)'}`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                                            {moveResult.success ? <CheckCircle2 size={16} color="var(--accent-primary)" /> : <AlertTriangle size={16} color="#ff4d4d" />}
                                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{moveResult.success ? "Przesunięto" : "Błąd"}</span>
                                        </div>
                                        {moveResult.success ? (
                                            <div style={{ fontSize: '0.8rem' }}>
                                                {moveResult.productName}<br />
                                                <span style={{ color: 'var(--accent-primary)' }}>→ {moveResult.rackCode} [{moveResult.slotX}, {moveResult.slotY}]</span>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.75rem', color: '#ff4d4d' }}>{moveResult.message}</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Wydania */}
                            <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(255, 77, 77, 0.1)' }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}>
                                        <PackageMinus size={20} color="#ff4d4d" />
                                        Wydania
                                    </h2>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Wydanie towaru zgodnie z FIFO.
                                    </p>
                                </div>

                                <form onSubmit={(e) => { e.preventDefault(); handleOutbound(e); }} className="ht-form">
                                    <div className="input-group">
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                value={outboundBarcode}
                                                onChange={(e) => setOutboundBarcode(e.target.value)}
                                                placeholder="Kod produktu..."
                                                style={{ flex: 1 }}
                                            />
                                            <button type="button" onClick={() => { setScannerMode('outbound'); setIsScannerOpen(true); }} className="btn-action-ht">
                                                <Camera size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn-primary-ht" style={{ marginTop: '0.75rem', width: '100%', background: '#ff4d4d', borderColor: '#ff4d4d', fontSize: '0.85rem' }}>
                                        Wydaj towar
                                    </button>
                                </form>

                                {outboundResult && (
                                    <div className={`operation-result-mini ${outboundResult.success ? 'success' : 'error'}`} style={{
                                        marginTop: '1rem',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        background: outboundResult.success ? 'rgba(var(--accent-primary-rgb), 0.05)' : 'rgba(255, 77, 77, 0.05)',
                                        border: `1px solid ${outboundResult.success ? 'rgba(var(--accent-primary-rgb), 0.2)' : 'rgba(255, 77, 77, 0.2)'}`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                                            {outboundResult.success ? <CheckCircle2 size={16} color="var(--accent-primary)" /> : <AlertTriangle size={16} color="#ff4d4d" />}
                                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{outboundResult.success ? "Wydano" : "Błąd"}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem' }}>
                                            {outboundResult.success ? "Produkt opuścił magazyn." : outboundResult.message}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Tabs.Content>
                </Tabs.Root>
            </div>

            <MoveModal
                open={isMoveModalOpen}
                onOpenChange={setIsMoveModalOpen}
                item={movingItem}
                racks={racks}
                products={products}
                inventory={inventoryData}
                onMove={handleMoveSubmit}
            />

            <Dialog.Root open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="modal-overlay" />
                    <Dialog.Content className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <Camera size={20} className="header-icon" />
                            <Dialog.Title>Skaner kodów - {scannerMode === 'inbound' ? 'Przyjęcie' : scannerMode === 'outbound' ? 'Wydanie' : 'Przesunięcie'}</Dialog.Title>
                            <Dialog.Close asChild>
                                <button className="close-btn"><X size={20} /></button>
                            </Dialog.Close>
                        </div>
                        <div id="reader" style={{ width: '100%', minHeight: '300px' }}></div>
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.85rem' }}>
                            <p>Umieść kod kreskowy w polu widzenia kamery. Skanowanie nastąpi automatycznie.</p>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <Dialog.Root open={isConflictModalOpen} onOpenChange={setIsConflictModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="modal-overlay" />
                    <Dialog.Content className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <AlertTriangle size={20} className="header-icon" style={{ color: '#ff4d4d' }} />
                            <Dialog.Title>Konflikt oznaczeń regałów</Dialog.Title>
                        </div>
                        <div style={{ margin: '1.5rem 0' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                Niektóre kody regałów z importu już istnieją w bazie danych: <br />
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{conflictingCodes.join(', ')}</span>
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button className="btn-primary" onClick={() => processImport(csvBuffer, 'OVERWRITE')}>
                                <Trash2 size={16} /> Nadpisz istniejące regały
                            </button>
                            <button className="btn-primary" onClick={() => processImport(csvBuffer, 'RENAME')}>
                                <Copy size={16} /> Zmień nazwy na wolne
                            </button>
                            <button className="btn-secondary" onClick={() => setIsConflictModalOpen(false)}>
                                <Ban size={16} /> Anuluj operację
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <RackModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                editingRack={editingRack}
                onSave={handleSaveRack}
                invT={invT}
                existingRacks={racks}
                hasItems={editingRack ? inventoryData.some(i => i.rackCode === editingRack.code) : false}
            />

            <ProductModal
                open={isProductModalOpen}
                onOpenChange={setIsProductModalOpen}
                onSave={handleSaveProduct}
                editingProduct={editingProduct}
                hasInventoryItems={editingProduct ? inventoryData.some(i => i.productId === editingProduct.id) : false}
            />
        </Tooltip.Provider>
    );
};

export default InventoryContent;