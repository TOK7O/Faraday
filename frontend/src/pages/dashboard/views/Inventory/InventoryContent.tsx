import React, { useState, useRef, useEffect } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Grid3X3, FileUp, AlertTriangle, Search, LayoutGrid, List, RefreshCw, Camera, CheckCircle2, MapPin, PackagePlus, Box, Move, PackageMinus, X } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { getRacks, getProducts, getFullInventoryList, inboundOperation, outboundOperation, moveOperation, createRack, updateRack, deleteRack, createProduct, updateProduct, deleteProduct } from '@/api/axios';

import type { Rack, Product, FullInventoryItem } from "@/components/layouts/dashboard/inventory/InventoryContent.types";
import { RackCard } from "@/components/layouts/dashboard/inventory/RackCard";
import { ProductCatalog } from "@/components/layouts/dashboard/inventory/ProductCatalog";
import { RackModal } from "@/components/layouts/dashboard/inventory/RackModal";
import { ProductModal } from "@/components/layouts/dashboard/inventory/ProductModal";
import { MoveModal } from "@/components/layouts/dashboard/inventory/MoveModal";
import { Spinner } from "@/components/ui/Spinner";
import { SkeletonGrid } from "@/components/layouts/dashboard/inventory/InventorySkeletons";

import "./InventoryContent.scss";

const formatMessageNumbers = (msg: string) => {
    if (!msg) return msg;
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
    const [importResult, setImportResult] = useState<{ successCount: number, errorCount: number, errors: string[] } | null>(null);
    const [isImportResultModalOpen, setIsImportResultModalOpen] = useState(false);

    // Nowe stany dla interaktywnego importu
    const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
    const [importType, setImportType] = useState<'racks' | 'products' | null>(null);
    const [isImportPreviewModalOpen, setIsImportPreviewModalOpen] = useState(false);
    const [selectedPreviewItem, setSelectedPreviewItem] = useState<any | null>(null);
    const [batchProgress, setBatchProgress] = useState<{ current: number, total: number } | null>(null);

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
    const productFileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const racksData = await getRacks();
            setRacks(racksData.map((r: any) => ({
                id: r.id, code: r.code, m: r.rows, n: r.columns, tempMin: r.minTemperature, tempMax: r.maxTemperature,
                maxWeight: r.maxWeightKg, maxWidth: r.maxItemWidthMm, maxHeight: r.maxItemHeightMm, maxDepth: r.maxItemDepthMm, comment: r.comment
            })));

            const productsData = await getProducts();
            setProducts(productsData.map((p: any) => ({
                id: p.id, scanCode: p.scanCode, name: p.name, category: p.isHazardous ? "ADR" : "Standard",
                weightKg: p.weightKg, widthMm: p.widthMm, heightMm: p.heightMm, depthMm: p.depthMm,
                tempRequired: (p.requiredMinTemp + p.requiredMaxTemp) / 2,
                requiredMinTemp: p.requiredMinTemp,
                requiredMaxTemp: p.requiredMaxTemp,
                isHazardous: p.isHazardous,
                hazardClassification: p.hazardClassification,
                validityDays: p.validityDays,
                photoUrl: p.photoUrl,
                comment: p.comment || ""
            })));

            const inventoryData = await getFullInventoryList();
            setInventoryData(inventoryData.map((item: any) => ({
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


    const parseCSV = (text: string, type: 'racks' | 'products') => {
        const lines = text.split(/\r?\n/);
        const results: any[] = [];

        const normalize = (v: string | undefined) => {
            if (!v) return 0;
            const val = parseFloat(v.replace(',', '.'));
            return isNaN(val) ? 0 : val;
        };

        lines.forEach((line, index) => {
            try {
                const trimmed = line.trim();
                // Pomiń puste linie i komentarze, ale nie usuwaj linii startujących od # jeśli to nagłówek
                if (!trimmed) return;

                // Jeśli to nagłówek z deklaracji użytkownika (np. #Nazwa...)
                const isHeaderLine = trimmed.toLowerCase().includes('nazwa;') || trimmed.toLowerCase().includes('code;');
                if (trimmed.startsWith("#") && !isHeaderLine) return;

                // Traktuj # na początku nagłówka jako część tekstu do pominięcia
                let cleanLine = trimmed;
                if (trimmed.startsWith("#") && isHeaderLine) {
                    cleanLine = trimmed.substring(1);
                }

                const parts = cleanLine.split(";").map(p => p.trim());
                if (parts.length < 5) return;

                if (type === 'racks') {
                    const [code, rows, cols, tMin, tMax, w, wi, h, d, c] = parts;

                    if (code.toLowerCase() === 'code' || code.toLowerCase() === 'kod' || !code) return;

                    const rackDto = {
                        code,
                        rows: Math.max(1, parseInt(rows) || 0),
                        columns: Math.max(1, parseInt(cols) || 0),
                        minTemperature: normalize(tMin),
                        maxTemperature: normalize(tMax),
                        maxWeightKg: normalize(w),
                        maxItemWidthMm: normalize(wi),
                        maxItemHeightMm: normalize(h),
                        maxItemDepthMm: normalize(d),
                        comment: c || ""
                    };

                    const existing = racks.find(r => r.code === rackDto.code);
                    const validationErrors: string[] = [];
                    let occupied = false;

                    if (existing) {
                        const rackItems = inventoryData.filter(i => i.rackCode === existing.code);
                        occupied = rackItems.length > 0;

                        rackItems.forEach(item => {
                            const product = products.find(p => p.id === item.productId);
                            if (product) {
                                if (rackDto.minTemperature < product.requiredMinTemp || rackDto.maxTemperature > product.requiredMaxTemp) {
                                    validationErrors.push(`Błąd temperatury: '${product.name}' wymaga ${product.requiredMinTemp}°C do ${product.requiredMaxTemp}°C. Nowy zakres (${rackDto.minTemperature}°C - ${rackDto.maxTemperature}°C) jest niedopuszczalny.`);
                                }
                                if (product.widthMm > rackDto.maxItemWidthMm || product.heightMm > rackDto.maxItemHeightMm || product.depthMm > rackDto.maxItemDepthMm) {
                                    validationErrors.push(`Błąd wymiarów: '${product.name}' (${product.widthMm}x${product.heightMm}x${product.depthMm}mm) nie zmieści się w nowych limitach.`);
                                }
                            }
                        });

                        const currentTotalWeight = rackItems.reduce((acc, item) => acc + (item.productWeightKg || 0), 0);
                        if (currentTotalWeight > rackDto.maxWeightKg) {
                            validationErrors.push(`Błąd nośności: Obecna masa (${currentTotalWeight.toFixed(1)}kg) przekracza nowy limit (${rackDto.maxWeightKg}kg).`);
                        }
                    }

                    results.push({
                        status: existing ? 'conflict' : 'new',
                        data: rackDto,
                        hasItems: occupied,
                        validationErrors,
                        existingData: existing ? {
                            code: existing.code,
                            rows: existing.m,
                            columns: existing.n,
                            minTemperature: existing.tempMin,
                            maxTemperature: existing.tempMax,
                            maxWeightKg: existing.maxWeight,
                            maxItemWidthMm: existing.maxWidth,
                            maxItemHeightMm: existing.maxHeight,
                            maxItemDepthMm: existing.maxDepth,
                            comment: existing.comment || ""
                        } : null,
                        id: existing?.id,
                        action: existing ? 'skip' : 'create'
                    });
                } else {
                    const [name, id, photo, tMin, tMax, w, wi, h, d, comment, vDays, isH] = parts;

                    if (name.toLowerCase() === 'nazwa' || name.toLowerCase() === 'name' || !id) return;

                    const productDto = {
                        name: name || "Bez nazwy",
                        scanCode: id,
                        photoUrl: photo || "",
                        requiredMinTemp: normalize(tMin),
                        requiredMaxTemp: normalize(tMax),
                        weightKg: normalize(w),
                        widthMm: normalize(wi),
                        heightMm: normalize(h),
                        depthMm: normalize(d),
                        comment: comment || "",
                        validityDays: parseInt(vDays) || 0,
                        isHazardous: isH ? (isH.toUpperCase() === 'TRUE' || isH === '1' || isH.toLowerCase() === 'tak') : false
                    };

                    if (!productDto.scanCode) return;

                    const existing = products.find(p => p.scanCode === productDto.scanCode);
                    results.push({
                        status: existing ? 'conflict' : 'new',
                        data: productDto,
                        existingData: existing ? {
                            name: existing.name,
                            scanCode: existing.scanCode,
                            photoUrl: existing.photoUrl,
                            requiredMinTemp: existing.requiredMinTemp,
                            requiredMaxTemp: existing.requiredMaxTemp,
                            weightKg: existing.weightKg,
                            widthMm: existing.widthMm,
                            heightMm: existing.heightMm,
                            depthMm: existing.depthMm,
                            comment: existing.comment || "",
                            validityDays: existing.validityDays,
                            isHazardous: existing.isHazardous
                        } : null,
                        id: existing?.id,
                        action: existing ? 'skip' : 'create'
                    });
                }
            } catch (err) {
                console.error(`Error parsing CSV at line ${index}:`, err);
            }
        });
        return results;
    };

    const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const preview = parseCSV(text, 'racks');
                if (preview.length === 0) {
                    alert("Nie znaleziono poprawnych danych w pliku CSV. Sprawdź format (średniki, nagłówki).");
                    return;
                }
                setImportType('racks');
                setImportPreviewData(preview);
                setIsImportPreviewModalOpen(true);
            } catch (err) {
                console.error("CSV Import error:", err);
                alert("Wystąpił błąd podczas analizowania pliku CSV.");
            }
        };
        reader.onerror = () => alert("Błąd odczytu pliku.");
        reader.readAsText(file);
        e.target.value = "";
    };

    const handleProductCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const preview = parseCSV(text, 'products');
                if (preview.length === 0) {
                    alert("Nie znaleziono poprawnych danych produktów w pliku CSV.");
                    return;
                }
                setImportType('products');
                setImportPreviewData(preview);
                setIsImportPreviewModalOpen(true);
            } catch (err) {
                console.error("Product CSV Import error:", err);
                alert("Wystąpił błąd podczas analizowania pliku produktów.");
            }
        };
        reader.onerror = () => alert("Błąd odczytu pliku.");
        reader.readAsText(file);
        e.target.value = "";
    };

    const handleConfirmImport = async () => {
        if (!importType) return;

        const toProcess = importPreviewData.filter(item => item.action !== 'skip');
        if (toProcess.length === 0) {
            setIsImportPreviewModalOpen(false);
            return;
        }

        setIsLoading(true);
        setBatchProgress({ current: 0, total: toProcess.length });

        let success = 0;
        let errors: string[] = [];
        for (let i = 0; i < toProcess.length; i++) {
            const item = toProcess[i];
            setBatchProgress({ current: i + 1, total: toProcess.length });

            try {
                let payload = { ...item.data };
                if (item.action === 'update') {
                    if (importType === 'racks') {
                        // RackUpdateDto nie ma Code, Rows, Columns
                        const { code, rows, columns, ...updateData } = payload;
                        payload = updateData;
                    } else {
                        // ProductUpdateDto nie ma ScanCode
                        const { scanCode, ...updateData } = payload;
                        payload = updateData;
                    }
                }
                if (importType === 'racks') {
                    if (item.action === 'update') {
                        await updateRack(item.id, payload);
                    } else {
                        await createRack(payload);
                    }
                } else {
                    if (item.action === 'update') {
                        await updateProduct(item.id, payload);
                    } else {
                        await createProduct(payload);
                    }
                }
                success++;
            } catch (err: any) {
                const identifier = item.data.code || item.data.scanCode || `Wiersz ${i + 1}`;
                errors.push(`Błąd dla ${identifier}: ${err.response?.data?.message || err.message}`);
            }
        }
        setImportResult({ successCount: success, errorCount: errors.length, errors });
        setIsImportPreviewModalOpen(false);
        setIsImportResultModalOpen(true);
        setBatchProgress(null);
        setIsLoading(false);
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
                    try {
                        const responseData = await inboundOperation(decodedText);
                        setInboundResult({ ...responseData, success: true, timestamp: new Date().toLocaleString(), operator: localStorage.getItem("username") || "Admin" });
                        fetchData();
                    } catch (e: any) {
                        setInboundResult({ success: false, message: e.response?.data?.message || "Błąd podczas przyjmowania.", timestamp: new Date().toLocaleString(), operator: localStorage.getItem("username") || "Admin" });
                    }
                } else if (scannerMode === 'outbound') {
                    setOutboundBarcode(decodedText);
                    try {
                        const responseData = await outboundOperation(decodedText);
                        setOutboundResult({ ...responseData, success: true, timestamp: new Date().toLocaleString(), operator: localStorage.getItem("username") || "Admin" });
                        fetchData();
                    } catch (e: any) {
                        setOutboundResult({ success: false, message: e.response?.data?.message || "Błąd podczas wydawania produktu.", timestamp: new Date().toLocaleString(), operator: localStorage.getItem("username") || "Admin" });
                    }
                } else {
                    // Move mode: find item first
                    const item = inventoryData.find(i => i.barcode === decodedText);
                    if (item) {
                        setMovingItem(item);
                        setIsMoveModalOpen(true);
                    } else {
                        setMoveResult({ success: false, message: "Nie znaleziono produktu o tym kodzie w magazynie.", timestamp: new Date().toLocaleString(), operator: localStorage.getItem("username") || "Admin" });
                    }
                }
                setIsScannerOpen(false);
                scanner?.clear();
            }, (_) => { /* ignoruj błędy skanowania */ });
        }
        return () => { scanner?.clear(); };
    }, [isScannerOpen, scannerMode]);

    const handleInbound = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            const responseData = await inboundOperation(inboundBarcode);
            setInboundResult({
                ...responseData,
                success: true,
                timestamp: new Date().toLocaleString(),
                operator: localStorage.getItem("username") || "Admin"
            });
            fetchData();
        } catch (e: any) {
            setInboundResult({
                success: false,
                message: e.response?.data?.message || "Błąd podczas przyjmowania.",
                timestamp: new Date().toLocaleString(),
                operator: localStorage.getItem("username") || "Admin"
            });
        }
    };

    const handleOutbound = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            const responseData = await outboundOperation(outboundBarcode);
            setOutboundResult({
                ...responseData,
                success: true,
                timestamp: new Date().toLocaleString(),
                operator: localStorage.getItem("username") || "Admin"
            });
            fetchData();
        } catch (e: any) {
            setOutboundResult({
                success: false,
                message: e.response?.data?.message || "Błąd podczas wydawania produktu.",
                timestamp: new Date().toLocaleString(),
                operator: localStorage.getItem("username") || "Admin"
            });
        }
    };

    const handleMoveSubmit = async (targetRackCode: string, targetSlotX: number, targetSlotY: number) => {
        if (!movingItem) return;
        setIsLoading(true);
        try {
            const dto = {
                barcode: movingItem.barcode,
                sourceRackCode: movingItem.rackCode,
                sourceSlotX: movingItem.slotX,
                sourceSlotY: movingItem.slotY,
                targetRackCode,
                targetSlotX,
                targetSlotY
            };
            const responseData = await moveOperation(dto);
            setMoveResult({
                ...responseData,
                success: true,
                timestamp: new Date().toLocaleString(),
                operator: localStorage.getItem("username") || "Admin"
            });
            setIsMoveModalOpen(false);
            setMovingItem(null);
            fetchData();
        } catch (e: any) {
            setMoveResult({
                success: false,
                message: e.response?.data?.message || "Błąd podczas przesuwania.",
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
        try {
            await deleteRack(id);
            fetchData();
        } catch (e) {
            alert("Wystąpił błąd podczas usuwania regału.");
        } finally { setIsLoading(false); }
    };

    const handleDeleteProduct = async (id: number | string) => {
        if (!window.confirm("Czy na pewno chcesz usunąć ten produkt z katalogu?")) return;
        setIsLoading(true);
        try {
            await deleteProduct(id);
            fetchData();
        } catch (e) { alert("Wystąpił błąd podczas usuwania produktu."); } finally { setIsLoading(false); }
    };

    const closeModal = () => { setIsModalOpen(false); setIsProductModalOpen(false); setEditingRack(null); setEditingProduct(null); };


    const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
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
        setIsLoading(true);
        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, dto);
            } else {
                await createProduct(dto);
            }
            fetchData();
            closeModal();
        } catch (error: any) {
            alert(error.response?.data?.message || "Błąd połączenia z serwerem.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveRack = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const code = f.get("code")?.toString();
        const dto: any = {
            id: editingRack ? editingRack.id : 0,
            code: code,
            comment: f.get("comment"),
            minTemperature: Number(f.get("minTemperature")),
            maxTemperature: Number(f.get("maxTemperature")),
            maxWeightKg: Number(f.get("maxWeightKg")),
            maxItemWidthMm: Number(f.get("maxItemWidthMm")),
            maxItemHeightMm: Number(f.get("maxItemHeightMm")),
            maxItemDepthMm: Number(f.get("maxItemDepthMm"))
        };
        if (!editingRack) {
            dto.rows = Number(f.get("rows"));
            dto.columns = Number(f.get("columns"));
        }
        setIsLoading(true);
        try {
            if (editingRack) {
                await updateRack(editingRack.id, dto);
            } else {
                await createRack(dto);
            }
            fetchData();
            closeModal();
        } catch (error: any) {
            alert(error.response?.data?.message || "Błąd połączenia z serwerem.");
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
                            <input type="file" accept=".csv" ref={productFileInputRef} hidden onChange={handleProductCSVImport} />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn-primary-ht" onClick={() => productFileInputRef.current?.click()}>
                                    <FileUp size={18} /><span>Importuj CSV</span>
                                </button>
                                <button className="btn-primary-ht" onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}>
                                    <Plus size={18} /><span>{invT.defineProduct}</span>
                                </button>
                            </div>
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

            <Dialog.Root open={isImportPreviewModalOpen} onOpenChange={setIsImportPreviewModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay-ht" />
                    <Dialog.Content className="dialog-content-ht import-modal-ht">
                        <div className="modal-header">
                            <FileUp size={20} className="header-icon" style={{ color: 'var(--accent-primary)', filter: 'drop-shadow(0 0 8px var(--accent-primary))' }} />
                            <Dialog.Title>Paczka importowa: {importType === 'racks' ? 'Regały' : 'Produkty'}</Dialog.Title>
                            <Dialog.Close asChild>
                                <button className="close-btn"><X size={20} /></button>
                            </Dialog.Close>
                        </div>

                        <div className="import-preview-container">
                            {batchProgress ? (
                                <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '24px' }}>
                                    <Spinner size={40} />
                                    <p style={{ marginTop: '1.5rem', fontWeight: 600, fontSize: '1.1rem' }}>Przetwarzanie pakietu...</p>
                                    <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>{batchProgress.current} z {batchProgress.total} operacji zakończonych</p>
                                    <div style={{ width: '100%', maxWidth: '400px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', margin: '2rem auto 0', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                                            height: '100%',
                                            background: 'linear-gradient(90deg, var(--accent-primary), #4ade80)',
                                            boxShadow: '0 0 15px var(--accent-primary)',
                                            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }} />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="import-summary-strip">
                                        <div className="summary-item">
                                            <span className="label">Łącznie</span>
                                            <span className="value">{importPreviewData.length}</span>
                                        </div>
                                        <div className="summary-item">
                                            <span className="label">Nowe</span>
                                            <span className="value" style={{ color: '#4ade80' }}>
                                                {importPreviewData.filter(i => i.status === 'new').length}
                                            </span>
                                        </div>
                                        <div className="summary-item">
                                            <span className="label">Konflikty</span>
                                            <span className="value" style={{ color: '#facc15' }}>
                                                {importPreviewData.filter(i => i.status === 'conflict').length}
                                            </span>
                                        </div>
                                        <div className="summary-item" style={{ marginLeft: 'auto' }}>
                                            <span className="label">Do zapisu</span>
                                            <span className="value">
                                                {importPreviewData.filter(i => i.action !== 'skip').length}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="import-table-wrapper">
                                        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                            <table className="import-table">
                                                <thead>
                                                    <tr>
                                                        <th>Status</th>
                                                        <th>Kod / Identyfikator</th>
                                                        <th>Decyzja</th>
                                                        <th>Działanie</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {importPreviewData.map((item, idx) => (
                                                        <tr key={idx} style={{
                                                            background: selectedPreviewItem === item ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'transparent'
                                                        }}>
                                                            <td>
                                                                <span className={`status-badge ${item.status === 'conflict' ? 'conflict' : 'new'}`}>
                                                                    {item.status === 'conflict' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                                                                    {item.status === 'conflict' ? 'Konflikt' : 'Nowy'}
                                                                </span>
                                                            </td>
                                                            <td style={{ fontWeight: 700, fontFamily: 'Space Grotesk' }}>{item.data.code || item.data.scanCode}</td>
                                                            <td>
                                                                <select
                                                                    value={item.action}
                                                                    onChange={(e) => {
                                                                        const newData = [...importPreviewData];
                                                                        newData[idx].action = e.target.value;
                                                                        setImportPreviewData(newData);
                                                                    }}
                                                                    style={{
                                                                        background: 'rgba(255,255,255,0.05)',
                                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                                        borderRadius: '8px',
                                                                        padding: '4px 8px',
                                                                        color: 'white',
                                                                        fontSize: '0.8rem',
                                                                        outline: 'none'
                                                                    }}
                                                                >
                                                                    {item.status === 'conflict' ? (
                                                                        <>
                                                                            <option value="skip">Pomiń (Zachowaj obecny)</option>
                                                                            <option value="update">Zaktualizuj (Nadpisz)</option>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <option value="create">Utwórz nowy</option>
                                                                            <option value="skip">Anuluj ten wiersz</option>
                                                                        </>
                                                                    )}
                                                                </select>
                                                            </td>
                                                            <td>
                                                                <button
                                                                    className={`btn-action-ht ${selectedPreviewItem === item ? 'active' : ''}`}
                                                                    onClick={() => setSelectedPreviewItem(selectedPreviewItem === item ? null : item)}
                                                                    title="Pokaż różnice"
                                                                >
                                                                    {selectedPreviewItem === item ? <X size={16} /> : <Search size={16} />}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {selectedPreviewItem && (
                                        <div className="diff-view-master-detail">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {selectedPreviewItem.validationErrors && selectedPreviewItem.validationErrors.length > 0 && (
                                                    <div className="validation-warning">
                                                        <div className="warning-header">
                                                            <AlertTriangle size={18} /> Krytyczne ostrzeżenia
                                                        </div>
                                                        <ul>
                                                            {selectedPreviewItem.validationErrors.map((err: string, i: number) => (
                                                                <li key={i}>{err}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {selectedPreviewItem.hasItems && (!selectedPreviewItem.validationErrors || selectedPreviewItem.validationErrors.length === 0) && (
                                                    <div className="validation-warning" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd' }}>
                                                        <div className="warning-header" style={{ color: '#60a5fa' }}>
                                                            <Box size={18} /> Informacja o zawartości
                                                        </div>
                                                        <p style={{ fontSize: '0.85rem', margin: 0, paddingLeft: '1.5rem' }}>
                                                            Ten regał posiada aktualnie towary. Sugerujemy ostrożność przy zmianie parametrów fizycznych.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div className="diff-card">
                                                    <div className="card-title" style={{ opacity: 0.5 }}>
                                                        <LayoutGrid size={14} /> Obecnie w systemie
                                                    </div>
                                                    {selectedPreviewItem.existingData ? (
                                                        Object.entries(selectedPreviewItem.existingData).map(([key, val]: [string, any]) => (
                                                            <div key={key} className="diff-row">
                                                                <span className="label">{key}</span>
                                                                <span className="value">{String(val)}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.3, fontStyle: 'italic' }}>
                                                            Brak danych (Nowy element)
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="diff-card" style={{ borderLeft: '2px solid var(--accent-primary)' }}>
                                                    <div className="card-title" style={{ color: 'var(--accent-primary)' }}>
                                                        <FileUp size={14} /> Dane z pliku CSV
                                                    </div>
                                                    {Object.entries(selectedPreviewItem.data).map(([key, val]: [string, any]) => {
                                                        const isDifferent = selectedPreviewItem.existingData && String(val) !== String(selectedPreviewItem.existingData[key]);
                                                        return (
                                                            <div key={key} className="diff-row">
                                                                <span className="label">{key}</span>
                                                                <span className={`value ${isDifferent ? 'changed' : ''}`}>
                                                                    {String(val)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn-secondary" onClick={() => setIsImportPreviewModalOpen(false)}>Anuluj</button>
                            <button className="btn-primary-ht" onClick={handleConfirmImport} disabled={!!batchProgress || importPreviewData.length === 0}>
                                Zatwierdź i importuj ({importPreviewData.filter(i => i.action !== 'skip').length})
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <Dialog.Root open={isImportResultModalOpen} onOpenChange={setIsImportResultModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay-ht" />
                    <Dialog.Content className="dialog-content-ht" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <FileUp size={20} className="header-icon" />
                            <Dialog.Title>Wynik importu CSV</Dialog.Title>
                            <Dialog.Close asChild>
                                <button className="close-btn"><X size={20} /></button>
                            </Dialog.Close>
                        </div>
                        <div style={{ margin: '1.5rem 0' }}>
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '1.5rem' }}>
                                <div style={{ flex: 1, padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80' }}>{importResult?.successCount}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Sukcesów</div>
                                </div>
                                <div style={{ flex: 1, padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f87171' }}>{importResult?.errorCount}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Błędów</div>
                                </div>
                            </div>

                            {importResult && importResult.errors.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 }}>Szczegóły błędów:</p>
                                    <div style={{
                                        maxHeight: '250px',
                                        overflowY: 'auto',
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                                            {importResult.errors.map((err, i) => (
                                                <li key={i} style={{ marginBottom: '4px', color: '#f87171' }}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-primary" onClick={() => setIsImportResultModalOpen(false)}>
                                Zamknij
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
        </Tooltip.Provider >
    );
};

export default InventoryContent;
