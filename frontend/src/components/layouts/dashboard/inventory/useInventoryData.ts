import { useState, useRef, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
    getRacks,
    getProducts,
    getFullInventoryList,
    inboundOperation,
    outboundOperation,
    moveOperation,
    createRack,
    updateRack,
    deleteRack,
    createProduct,
    updateProduct,
    deleteProduct,
    recognizeProduct,
} from "@/api/axios";

import type {
    Rack,
    Product,
    FullInventoryItem,
} from "@/components/layouts/dashboard/inventory/InventoryContent.types";

export const useInventoryData = (invT: any) => {
    const userRole = localStorage.getItem("role");
    const isAdmin = userRole === "Administrator";

    const [racks, setRacks] = useState<Rack[]>([]);
    const [trainingProduct, setTrainingProduct] = useState<Product | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [inventoryData, setInventoryData] = useState<FullInventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [productViewMode, setProductViewMode] = useState<"grid" | "list">(
        "grid",
    );

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingRack, setEditingRack] = useState<Rack | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [importResult, setImportResult] = useState<{
        successCount: number;
        errorCount: number;
        errors: string[];
    } | null>(null);
    const [isImportResultModalOpen, setIsImportResultModalOpen] = useState(false);

    const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
    const [importType, setImportType] = useState<"racks" | "products" | null>(
        null,
    );
    const [isImportPreviewModalOpen, setIsImportPreviewModalOpen] =
        useState(false);
    const [selectedPreviewItem, setSelectedPreviewItem] = useState<any | null>(
        null,
    );
    const [batchProgress, setBatchProgress] = useState<{
        current: number;
        total: number;
    } | null>(null);

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerMode, setScannerMode] = useState<
        "inbound" | "outbound" | "move"
    >("inbound");
    const [inboundBarcode, setInboundBarcode] = useState("");
    const [inboundResult, setInboundResult] = useState<any>(null);
    const [outboundBarcode, setOutboundBarcode] = useState("");
    const [outboundResult, setOutboundResult] = useState<any>(null);
    const [moveResult, setMoveResult] = useState<any>(null);

    const [moveBarcode, setMoveBarcode] = useState("");
    const [movingItem, setMovingItem] = useState<FullInventoryItem | null>(null);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

    const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [identifiedProduct, setIdentifiedProduct] = useState<any | null>(null);

    const aiFileInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const productFileInputRef = useRef<HTMLInputElement>(null);

    const handleAiFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await handleAiCapture(file);
        }
        e.target.value = "";
    };

    const handleAiCapture = async (file: File) => {
        setIsAiScannerOpen(false);
        setAiProcessing(true);
        setIdentifiedProduct(null);

        try {
            const result = await recognizeProduct(file);

            if (result.success && result.product) {
                setIdentifiedProduct({
                    ...result.product,
                    confidenceScore: result.confidenceScore,
                    confidenceLevel: result.confidenceLevel,
                });

                const identifyTabTrigger = document.querySelector(
                    '[data-value="identify"]',
                ) as HTMLElement;
                if (identifyTabTrigger) identifyTabTrigger.click();
            } else {
                alert(invT.errors.notFound || "Product not recognized");
            }
        } catch (error: any) {
            console.error("AI Recognition failed", error);
            alert(
                error.response?.data ||
                "Recognition failed. Please check your internet connection.",
            );
        } finally {
            setAiProcessing(false);
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const racksData = await getRacks();
            setRacks(
                racksData.map((r: any) => ({
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
                    comment: r.comment,
                })),
            );

            const productsData = await getProducts();
            setProducts(
                productsData.map((p: any) => ({
                    id: p.id,
                    scanCode: p.scanCode,
                    name: p.name,
                    category: p.isHazardous ? "ADR" : "Standard",
                    weightKg: p.weightKg,
                    widthMm: p.widthMm,
                    heightMm: p.heightMm,
                    depthMm: p.depthMm,
                    tempRequired: (p.requiredMinTemp + p.requiredMaxTemp) / 2,
                    requiredMinTemp: p.requiredMinTemp,
                    requiredMaxTemp: p.requiredMaxTemp,
                    isHazardous: p.isHazardous,
                    hazardClassification: p.hazardClassification,
                    validityDays: p.validityDays,
                    photoUrl: p.photoUrl,
                    comment: p.comment || "",
                })),
            );

            const invData = await getFullInventoryList();
            setInventoryData(
                invData.map((item: any) => ({
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
                    hazardClassification: item.hazardClassification,
                })),
            );
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
        const stockTabTrigger = document.querySelector(
            '[data-value="stock"]',
        ) as HTMLElement;
        if (stockTabTrigger) stockTabTrigger.click();
    };

    const parseCSV = (text: string, type: "racks" | "products") => {
        const lines = text.split(/\r?\n/);
        const results: any[] = [];

        const normalize = (v: string | undefined) => {
            if (!v) return 0;
            const val = parseFloat(v.replace(",", "."));
            return isNaN(val) ? 0 : val;
        };

        lines.forEach((line, index) => {
            try {
                const trimmed = line.trim();
                if (!trimmed) return;

                const isHeaderLine =
                    trimmed.toLowerCase().includes("nazwa;") ||
                    trimmed.toLowerCase().includes("code;");
                if (trimmed.startsWith("#") && !isHeaderLine) return;

                let cleanLine = trimmed;
                if (trimmed.startsWith("#") && isHeaderLine) {
                    cleanLine = trimmed.substring(1);
                }

                const parts = cleanLine.split(";").map((p) => p.trim());
                if (parts.length < 5) return;

                if (type === "racks") {
                    const [code, rows, cols, tMin, tMax, w, wi, h, d, c] = parts;

                    if (
                        code.toLowerCase() === "code" ||
                        code.toLowerCase() === "kod" ||
                        !code
                    )
                        return;

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
                        comment: c || "",
                    };

                    const existing = racks.find((r) => r.code === rackDto.code);
                    const validationErrors: string[] = [];
                    let occupied = false;

                    if (existing) {
                        const rackItems = inventoryData.filter(
                            (i) => i.rackCode === existing.code,
                        );
                        occupied = rackItems.length > 0;

                        rackItems.forEach((item) => {
                            const product = products.find((p) => p.id === item.productId);
                            if (product) {
                                if (
                                    rackDto.minTemperature < product.requiredMinTemp ||
                                    rackDto.maxTemperature > product.requiredMaxTemp
                                ) {
                                    validationErrors.push(
                                        `${invT.import.warnings.contentInfo}: '${product.name}' requires ${product.requiredMinTemp}°C - ${product.requiredMaxTemp}°C. New range (${rackDto.minTemperature}°C - ${rackDto.maxTemperature}°C) is invalid.`,
                                    );
                                }
                                if (
                                    product.widthMm > rackDto.maxItemWidthMm ||
                                    product.heightMm > rackDto.maxItemHeightMm ||
                                    product.depthMm > rackDto.maxItemDepthMm
                                ) {
                                    validationErrors.push(
                                        `Dimensions error: '${product.name}' (${product.widthMm}x${product.heightMm}x${product.depthMm}mm) will not fit in new limits.`,
                                    );
                                }
                            }
                        });

                        const currentTotalWeight = rackItems.reduce(
                            (acc, item) => acc + (item.productWeightKg || 0),
                            0,
                        );
                        if (currentTotalWeight > rackDto.maxWeightKg) {
                            validationErrors.push(
                                `Weight error: Current weight (${currentTotalWeight.toFixed(1)}kg) exceeds new limit (${rackDto.maxWeightKg}kg).`,
                            );
                        }
                    }

                    results.push({
                        status: existing ? "conflict" : "new",
                        data: rackDto,
                        hasItems: occupied,
                        validationErrors,
                        existingData: existing
                            ? {
                                code: existing.code,
                                rows: existing.m,
                                columns: existing.n,
                                minTemperature: existing.tempMin,
                                maxTemperature: existing.tempMax,
                                maxWeightKg: existing.maxWeight,
                                maxItemWidthMm: existing.maxWidth,
                                maxItemHeightMm: existing.maxHeight,
                                maxItemDepthMm: existing.maxDepth,
                                comment: existing.comment || "",
                            }
                            : null,
                        id: existing?.id,
                        action: existing ? "skip" : "create",
                    });
                } else {
                    const [
                        name,
                        id,
                        photo,
                        tMin,
                        tMax,
                        w,
                        wi,
                        h,
                        d,
                        comment,
                        vDays,
                        isH,
                    ] = parts;

                    if (
                        name.toLowerCase() === "nazwa" ||
                        name.toLowerCase() === "name" ||
                        !id
                    )
                        return;

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
                        isHazardous: isH
                            ? isH.toUpperCase() === "TRUE" ||
                            isH === "1" ||
                            isH.toLowerCase() === "tak"
                            : false,
                    };

                    if (!productDto.scanCode) return;

                    const existing = products.find(
                        (p) => p.scanCode === productDto.scanCode,
                    );
                    results.push({
                        status: existing ? "conflict" : "new",
                        data: productDto,
                        existingData: existing
                            ? {
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
                                isHazardous: existing.isHazardous,
                            }
                            : null,
                        id: existing?.id,
                        action: existing ? "skip" : "create",
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
                const preview = parseCSV(text, "racks");
                if (preview.length === 0) {
                    alert(invT.errors.csv.noData);
                    return;
                }
                setImportType("racks");
                setImportPreviewData(preview);
                setIsImportPreviewModalOpen(true);
            } catch (err: any) {
                console.error("CSV Import error:", err);
                alert(err.response?.data || invT.errors.csv.parseError);
            }
        };
        reader.onerror = () => alert(invT.errors.csv.readError);
        reader.readAsText(file);
        e.target.value = "";
    };

    const handleProductCSVImport = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const preview = parseCSV(text, "products");
                if (preview.length === 0) {
                    alert(invT.errors.csv.noProducts);
                    return;
                }
                setImportType("products");
                setImportPreviewData(preview);
                setIsImportPreviewModalOpen(true);
            } catch (err: any) {
                console.error("Product CSV Import error:", err);
                alert(err.response?.data || invT.errors.csv.parseError);
            }
        };
        reader.onerror = () => alert(invT.errors.csv.readError);
        reader.readAsText(file);
        e.target.value = "";
    };

    const handleConfirmImport = async () => {
        if (!importType) return;

        const toProcess = importPreviewData.filter(
            (item) => item.action !== "skip",
        );
        if (toProcess.length === 0) {
            setIsImportPreviewModalOpen(false);
            return;
        }

        setIsLoading(true);
        setBatchProgress({ current: 0, total: toProcess.length });

        let success = 0;
        const errors: string[] = [];
        for (let i = 0; i < toProcess.length; i++) {
            const item = toProcess[i];
            setBatchProgress({ current: i + 1, total: toProcess.length });

            try {
                let payload = { ...item.data };
                if (item.action === "update") {
                    if (importType === "racks") {
                        const { code, rows, columns, ...updateData } = payload;
                        payload = updateData;
                    } else {
                        const { scanCode, ...updateData } = payload;
                        payload = updateData;
                    }
                }
                if (importType === "racks") {
                    if (item.action === "update") {
                        await updateRack(item.id, payload);
                    } else {
                        await createRack(payload);
                    }
                } else {
                    if (item.action === "update") {
                        await updateProduct(item.id, payload);
                    } else {
                        await createProduct(payload);
                    }
                }
                success++;
            } catch (err: any) {
                const identifier =
                    item.data.code || item.data.scanCode || `Wiersz ${i + 1}`;
                errors.push(
                    `Błąd dla ${identifier}: ${err.response?.data || err.message}`,
                );
            }
        }
        setImportResult({
            successCount: success,
            errorCount: errors.length,
            errors,
        });
        setIsImportPreviewModalOpen(false);
        setIsImportResultModalOpen(true);
        setBatchProgress(null);
        setIsLoading(false);
        await fetchData();
    };

    // scanner
    const handleScanResult = async (decodedText: string) => {
        const operator = localStorage.getItem("username") || "Admin";
        const timestamp = new Date().toLocaleString();

        if (scannerMode === "inbound") {
            setInboundBarcode(decodedText);
        } else if (scannerMode === "outbound") {
            setOutboundBarcode(decodedText);
        } else if (scannerMode === "move") {
            setMoveBarcode(decodedText);

            const item = inventoryData.find((i) => i.barcode === decodedText);
            if (item) {
                setMovingItem(item);
                setIsMoveModalOpen(true);
                setMoveBarcode("");
            } else {
                setMoveResult({
                    success: false,
                    message: invT.errors.notFound,
                    timestamp,
                    operator,
                });
            }
        }
    };

    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;

        if (isScannerOpen) {
            const timer = setTimeout(() => {
                const element = document.getElementById("reader");
                if (!element) return;

                scanner = new Html5QrcodeScanner(
                    "reader",
                    {
                        fps: 20,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    },
                    false,
                );

                scanner.render(
                    async (decodedText) => {
                        await handleScanResult(decodedText);

                        if (scanner) {
                            try {
                                await scanner.clear();
                                scanner = null;
                            } catch (err) {
                                console.error("Błąd przy zamykaniu skanera:", err);
                            }
                        }

                        setIsScannerOpen(false);
                    },
                    () => { },
                );
            }, 500);

            return () => {
                clearTimeout(timer);
                if (scanner) {
                    scanner.clear().catch((err) => console.error("Cleanup error:", err));
                }
            };
        }
    }, [isScannerOpen, scannerMode, inventoryData]);

    const handleInbound = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            const responseData = await inboundOperation(inboundBarcode);
            setInboundResult({
                ...responseData,
                success: true,
                timestamp: new Date().toLocaleString(),
                operator: localStorage.getItem("username") || "Admin",
            });
            await fetchData();
        } catch (e: any) {
            setInboundResult({
                success: false,
                message: e.response?.data || invT.errors.inbound,
                timestamp: new Date().toLocaleString(),
                operator: localStorage.getItem("username") || "Admin",
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
                operator: localStorage.getItem("username") || "Admin",
            });
            await fetchData();
        } catch (e: any) {
            setOutboundResult({
                success: false,
                message: e.response?.data || invT.errors.outbound,
                timestamp: new Date().toLocaleString(),
                operator: localStorage.getItem("username") || "Admin",
            });
        }
    };

    const handleMoveSubmit = async (
        targetRackCode: string,
        targetSlotX: number,
        targetSlotY: number,
    ) => {
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
                targetSlotY,
            };
            const responseData = await moveOperation(dto);
            setMoveResult({
                ...responseData,
                success: true,
                timestamp: new Date().toLocaleString(),
                operator: localStorage.getItem("username") || "Admin",
            });
            setIsMoveModalOpen(false);
            setMovingItem(null);
            await fetchData();
        } catch (e: any) {
            setMoveResult({
                success: false,
                message: e.response?.data || invT.errors.move,
                timestamp: new Date().toLocaleString(),
                operator: localStorage.getItem("username") || "Admin",
            });
            setIsMoveModalOpen(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRack = async (id: number | string) => {
        if (!window.confirm(invT.deleteConfirm?.replace("{id}", id.toString())))
            return;
        setIsLoading(true);
        try {
            await deleteRack(id);
            await fetchData();
        } catch (e: any) {
            alert(e.response?.data || invT.errors.deleteRack);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteProduct = async (id: number | string) => {
        if (!window.confirm(invT.deleteProductConfirm)) return;
        setIsLoading(true);
        try {
            await deleteProduct(id);
            await fetchData();
        } catch (e: any) {
            alert(e.response?.data || invT.errors.deleteProduct);
        } finally {
            setIsLoading(false);
        }
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
            validityDays: f.get("validityDays")
                ? Number(f.get("validityDays"))
                : null,
            comment: f.get("comment"),
        };
        setIsLoading(true);
        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, dto);
            } else {
                await createProduct(dto);
            }
            await fetchData();
            closeModal();
        } catch (error: any) {
            alert(error.response?.data || invT.errors.connection);
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
            maxItemDepthMm: Number(f.get("maxItemDepthMm")),
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
            await fetchData();
            closeModal();
        } catch (error: any) {
            alert(error.response?.data || invT.errors.connection);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        // data
        racks,
        products,
        inventoryData,
        isLoading,
        isAdmin,
        searchQuery,
        setSearchQuery,
        productViewMode,
        setProductViewMode,

        // rack/product modals
        isModalOpen,
        setIsModalOpen,
        isProductModalOpen,
        setIsProductModalOpen,
        editingRack,
        setEditingRack,
        editingProduct,
        setEditingProduct,

        // import
        importResult,
        isImportResultModalOpen,
        setIsImportResultModalOpen,
        importPreviewData,
        setImportPreviewData,
        importType,
        isImportPreviewModalOpen,
        setIsImportPreviewModalOpen,
        selectedPreviewItem,
        setSelectedPreviewItem,
        batchProgress,

        // scanner
        isScannerOpen,
        setIsScannerOpen,
        scannerMode,
        setScannerMode,
        inboundBarcode,
        setInboundBarcode,
        inboundResult,
        outboundBarcode,
        setOutboundBarcode,
        outboundResult,
        moveResult,
        moveBarcode,
        setMoveBarcode,
        movingItem,
        setMovingItem,
        isMoveModalOpen,
        setIsMoveModalOpen,

        // AI
        isAiScannerOpen,
        setIsAiScannerOpen,
        aiProcessing,
        identifiedProduct,
        trainingProduct,
        setTrainingProduct,

        // refs
        aiFileInputRef,
        fileInputRef,
        productFileInputRef,

        // handlers
        fetchData,
        handleSlotClick,
        handleCSVImport,
        handleProductCSVImport,
        handleConfirmImport,
        handleInbound,
        handleOutbound,
        handleMoveSubmit,
        handleDeleteRack,
        handleDeleteProduct,
        handleSaveProduct,
        handleSaveRack,
        handleAiFileSelect,
        handleAiCapture,
        closeModal,
    };
};
