import React, { useState, useRef, useEffect } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Plus,
  Grid3X3,
  FileUp,
  AlertTriangle,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  Camera,
  CheckCircle2,
  MapPin,
  PackagePlus,
  Box,
  Move,
  PackageMinus,
  X,
  BrainCircuit,
  Upload,
  Database,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { ReferenceImageManager } from "@/components/layouts/dashboard/inventory/modals/ReferenceMediaManager";
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

import { RackCard } from "@/components/layouts/dashboard/inventory/RackCard";
import { ProductCatalog } from "@/components/layouts/dashboard/inventory/ProductCatalog";
import { RackModal } from "@/components/layouts/dashboard/inventory/modals/RackModal";
import { ProductModal } from "@/components/layouts/dashboard/inventory/modals/ProductModal";
import { MoveModal } from "@/components/layouts/dashboard/inventory/modals/MoveModal";
import { Spinner } from "@/components/ui/Spinner";
import { SkeletonGrid } from "@/components/layouts/dashboard/inventory/InventorySkeletons";
import { CameraSnapshot } from "@/components/ui/CameraSnapshot";

import "./InventoryContent.scss";
import "./StatsTab.scss";

const formatMessageNumbers = (msg: string) => {
  if (!msg) return msg;
  return msg.replace(/(\.\d*[1-9])0+(?!\d)/g, "$1").replace(/\.0+(?!\d)/g, "");
};

const InventoryContent = () => {
  const { t } = useTranslation();
  const invT = t.dashboardPage.content.inventory;

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
    setIdentifiedProduct(null); // Reset poprzedniego wyniku

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  const prettifyBackendError = (rawMsg: string) => {
    if (!rawMsg) return invT.errors.server;
    const msg = formatMessageNumbers(rawMsg);

    const noRacksMatch = msg.match(
      /No racks found meeting requirements for '(.*?)' \(Dim: (.*?) mm, Temp: (.*?)°C\)/i,
    );
    if (noRacksMatch) {
      return (
        <div className="pretty-error">
          <p>
            <strong>{invT.errors.noRacksMatch.title}</strong> ({noRacksMatch[1]}
            ).
          </p>
          <div className="error-specs">
            <span>
              {invT.errors.noRacksMatch.dimensions}:{" "}
              <strong>{noRacksMatch[2]} mm</strong>
            </span>
            <span>
              {invT.errors.noRacksMatch.temp}:{" "}
              <strong>{noRacksMatch[3]}°C</strong>
            </span>
          </div>
          <p className="error-hint">{invT.errors.noRacksMatch.hint}</p>
        </div>
      );
    }

    if (
      msg.includes("No available slots found") &&
      msg.includes("compatible racks")
    ) {
      return (
        <div className="pretty-error">
          <p>
            <strong>{invT.errors.noAvailableSlots.title}</strong>
          </p>
          <p className="error-hint">{invT.errors.noAvailableSlots.hint}</p>
        </div>
      );
    }

    const productNotFound = msg.match(/Product with barcode (.*?) not found/i);
    if (productNotFound) {
      return (
        <div className="pretty-error">
          <p>
            <strong>{invT.errors.productNotFound.title}</strong> (ID:{" "}
            {productNotFound[1]}).
          </p>
          <p className="error-hint">{invT.errors.productNotFound.hint}</p>
        </div>
      );
    }

    return <div className="pretty-error">{msg}</div>;
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

      const inventoryData = await getFullInventoryList();
      setInventoryData(
        inventoryData.map((item: any) => ({
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
        // Pomiń puste linie i komentarze, ale nie usuwaj linii startujących od # jeśli to nagłówek
        if (!trimmed) return;

        // Jeśli to nagłówek z deklaracji użytkownika (np. #Nazwa...)
        const isHeaderLine =
          trimmed.toLowerCase().includes("nazwa;") ||
          trimmed.toLowerCase().includes("code;");
        if (trimmed.startsWith("#") && !isHeaderLine) return;

        // Traktuj # na początku nagłówka jako część tekstu do pominięcia
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
      } catch (err) {
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
      } catch (err) {
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
          () => {},
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

  return (
    <Tooltip.Provider delayDuration={100} skipDelayDuration={0}>
      <div className="personnel-view-container">
        {/* UKRYTY INPUT DO UPLOADU ZDJĘĆ DLA AI */}
        <input
          type="file"
          accept="image/png, image/jpeg, image/webp"
          ref={aiFileInputRef}
          hidden
          onChange={handleAiFileSelect}
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
                  style={{ display: "flex", gap: "2rem", marginTop: "1rem" }}
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
                  onClick={fetchData}
                  className="btn-action-ht"
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner size={16} /> : <RefreshCw size={16} />}
                </button>
              </div>
            </div>
          </header>

          <Tabs.Content value="racks">
            {isAdmin && (
              <div
                className="action-bar"
                style={{ justifyContent: "flex-start", gap: "1rem" }}
              >
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  hidden
                  onChange={handleCSVImport}
                />
                <button
                  className="btn-primary-ht"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp size={18} />
                  <span>{invT.importCSV}</span>
                </button>
                <button
                  className="btn-primary-ht"
                  onClick={() => {
                    setEditingRack(null);
                    setIsModalOpen(true);
                  }}
                >
                  <Plus size={18} />
                  <span>{invT.addRack}</span>
                </button>
              </div>
            )}
            <div className="stats-grid">
              {racks.map((r) => (
                <RackCard
                  key={r.id}
                  rack={r}
                  inventory={inventoryData.filter((i) => i.rackCode === r.code)}
                  isAdmin={isAdmin}
                  onEdit={(rack) => {
                    setEditingRack(rack);
                    setIsModalOpen(true);
                  }}
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
                <button
                  className="btn-primary-ht"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsProductModalOpen(true);
                  }}
                >
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
                onDeleteProduct={handleDeleteProduct}
                onEditProduct={(p) => {
                  setEditingProduct(p);
                  setIsProductModalOpen(true);
                }}
                isLoading={isLoading}
              />
            ) : (
              <div className="empty-state-ht">{invT.emptyProducts}</div>
            )}
          </Tabs.Content>

          <Tabs.Content value="stock">
            <div className="action-bar">
              <div className="search-container">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder={invT.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="stock-grid">
              {inventoryData
                .filter(
                  (item) =>
                    item.productName
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    item.barcode.includes(searchQuery) ||
                    item.rackCode
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                )
                .map((item) => (
                  <div
                    key={item.itemId}
                    className={`glass-card stock-item-card ${item.barcode === searchQuery ? "highlight" : ""}`}
                  >
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
                        <span className="label">{invT.items.status}:</span>
                        <span
                          className={`status-tag ${item.status.toLowerCase()}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="label">{invT.items.entryDate}:</span>
                        <span>
                          {new Date(item.entryDate).toLocaleDateString()}
                        </span>
                      </div>
                      {item.expirationDate && (
                        <div className="detail-row">
                          <span className="label">
                            {invT.items.expirationDate}:
                          </span>
                          <span
                            className={
                              item.daysUntilExpiration &&
                              item.daysUntilExpiration <= 7
                                ? "text-danger"
                                : ""
                            }
                          >
                            {new Date(item.expirationDate).toLocaleDateString()}
                            {item.daysUntilExpiration !== undefined &&
                              ` (${item.daysUntilExpiration} ${invT.items.days})`}
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
                          <RefreshCw size={12} />{" "}
                          {item.currentRackTemperature.toFixed(1)}
                          °C
                        </div>
                      </div>
                      <div className="received-by">
                        {invT.items.receivedBy}:{" "}
                        <strong>{item.receivedByUsername}</strong>
                      </div>
                      <button
                        className="btn-action-ht"
                        onClick={() => {
                          setMovingItem(item);
                          setIsMoveModalOpen(true);
                        }}
                        title={invT.moveItem}
                        style={{
                          marginLeft: "auto",
                          padding: "4px 8px",
                          fontSize: "0.8rem",
                        }}
                      >
                        <span>{invT.moveTo}</span>
                      </button>
                    </div>
                  </div>
                ))}
              {inventoryData.length === 0 && !isLoading && (
                <div className="empty-state-ht">{invT.emptyStock}</div>
              )}
            </div>
          </Tabs.Content>
          <Tabs.Content value="identify">
            <div
              style={{
                maxWidth: "1000px",
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2rem",
                }}
              >
                <div
                  className="glass-card"
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1.5rem",
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      background: "rgba(var(--accent-primary-rgb), 0.1)",
                      padding: "1rem",
                      borderRadius: "50%",
                    }}
                  >
                    <BrainCircuit
                      size={48}
                      style={{ color: "var(--accent-primary)" }}
                    />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                      {invT.identify.identifyCard.title}
                    </h2>
                    <p className="text-muted">
                      {invT.identify.identifyCard.subtitle}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      flexWrap: "wrap",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      className="btn-primary-ht"
                      style={{ padding: "0.8rem 1.5rem" }}
                      onClick={() => setIsAiScannerOpen(true)}
                    >
                      <Camera size={20} />{" "}
                      {invT.identify.identifyCard.cameraBtn}
                    </button>
                    <button
                      className="btn-secondary"
                      style={{
                        padding: "0.8rem 1.5rem",
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                      onClick={() => aiFileInputRef.current?.click()}
                    >
                      <Upload size={20} />{" "}
                      {invT.identify.identifyCard.uploadBtn}
                    </button>
                  </div>

                  {identifiedProduct && (
                    <div
                      style={{
                        marginTop: "2rem",
                        width: "100%",
                        textAlign: "left",
                        borderTop: "1px solid var(--border-input)",
                        paddingTop: "1rem",
                        animation: "fadeIn 0.3s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {invT.identify.identifyCard.resultHeader}
                        </span>
                        <span
                          className={`status-badge ${identifiedProduct.confidenceLevel === "Excellent" ? "new" : "conflict"}`}
                        >
                          {identifiedProduct.confidenceLevel} (
                          {(identifiedProduct.confidenceScore * 100).toFixed(0)}
                          %)
                        </span>
                      </div>
                      <h3
                        style={{
                          fontSize: "1.4rem",
                          color: "var(--accent-primary)",
                          margin: "0 0 5px 0",
                        }}
                      >
                        {identifiedProduct.name}
                      </h3>
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: "1rem",
                          background: "rgba(255,255,255,0.05)",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          display: "inline-block",
                        }}
                      >
                        {identifiedProduct.scanCode}
                      </div>
                      <div
                        style={{
                          marginTop: "1rem",
                          fontSize: "0.9rem",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "10px",
                        }}
                      >
                        <div>
                          {invT.identify.identifyCard.weightLabel}{" "}
                          <strong>{identifiedProduct.weightKg} kg</strong>
                        </div>
                        <div>
                          {invT.identify.identifyCard.hazardousLabel}{" "}
                          <strong>
                            {identifiedProduct.isHazardous
                              ? invT.identify.identifyCard.yes
                              : invT.identify.identifyCard.no}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card" style={{ padding: "2rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "1.5rem",
                    borderBottom: "1px solid var(--border-input)",
                    paddingBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      padding: "8px",
                      borderRadius: "8px",
                    }}
                  >
                    <Database size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1.3rem", margin: 0 }}>
                      {invT.identify.trainingCard.title}
                    </h2>
                    <p
                      className="text-muted"
                      style={{ fontSize: "0.85rem", margin: 0 }}
                    >
                      {invT.identify.trainingCard.subtitle}
                    </p>
                  </div>
                </div>

                <div className="ht-form">
                  <div className="input-group">
                    <label>{invT.identify.trainingCard.selectLabel}</label>
                    <select
                      className="ht-input"
                      value={trainingProduct?.id || ""}
                      onChange={(e) => {
                        const prod = products.find(
                          (p) => p.id === Number(e.target.value),
                        );
                        setTrainingProduct(prod || null);
                      }}
                    >
                      <option value="">
                        {invT.identify.trainingCard.chooseProduct}
                      </option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.scanCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  {trainingProduct ? (
                    <div style={{ animation: "fadeIn 0.3s ease" }}>
                      <div
                        style={{
                          background: "rgba(var(--accent-primary-rgb), 0.05)",
                          border:
                            "1px solid rgba(var(--accent-primary-rgb), 0.2)",
                          padding: "1rem",
                          borderRadius: "8px",
                          marginBottom: "1rem",
                          marginTop: "1rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "var(--accent-primary)",
                            fontWeight: 600,
                            marginBottom: "4px",
                          }}
                        >
                          {invT.identify.trainingCard.activeContext}
                        </div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                          {trainingProduct.name}
                        </div>
                        <div style={{ fontFamily: "monospace", opacity: 0.8 }}>
                          {invT.identify.trainingCard.barcodeLabel}{" "}
                          {trainingProduct.scanCode}
                        </div>
                      </div>

                      <ReferenceImageManager
                        productId={trainingProduct.id}
                        scanCode={trainingProduct.scanCode}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "3rem 1rem",
                        color: "var(--text-muted)",
                        border: "2px dashed var(--border-input)",
                        borderRadius: "12px",
                        marginTop: "1rem",
                      }}
                    >
                      <Search
                        size={32}
                        style={{ opacity: 0.3, marginBottom: "1rem" }}
                      />
                      <p>{invT.identify.trainingCard.emptyState}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Tabs.Content>
          <Tabs.Content value="operations">
            <div className="operations-grid">
              {/* Przyjęcia (Inbound) */}
              <div className="glass-card inbound">
                <div className="card-header">
                  <h2>
                    <PackagePlus size={20} className="icon-accent" />
                    {invT.operations.inbound.title}
                  </h2>
                  <p className="text-muted">
                    {invT.operations.inbound.subtitle}
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleInbound(e);
                  }}
                  className="ht-form"
                >
                  <div className="input-group">
                    <div className="input-wrapper">
                      <input
                        className="operation-barcode-input"
                        value={inboundBarcode}
                        onChange={(e) => setInboundBarcode(e.target.value)}
                        placeholder={invT.operations.inbound.placeholder}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setScannerMode("inbound");
                          setIsScannerOpen(true);
                        }}
                        className="btn-action-ht"
                        title="Scan Barcode"
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary-ht btn-submit">
                    {invT.operations.inbound.submit}
                  </button>
                </form>

                {inboundResult && (
                  <div
                    className={`operation-result-mini ${inboundResult.success ? "success" : "error"}`}
                  >
                    <div className="result-status">
                      {inboundResult.success ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                      <span>
                        {inboundResult.success
                          ? invT.operations.inbound.success
                          : invT.operations.inbound.error}
                      </span>
                    </div>
                    <div className="result-details">
                      {inboundResult.success ? (
                        <span className="location-badge">
                          {inboundResult.rackCode} [{inboundResult.slotX},{" "}
                          {inboundResult.slotY}]
                        </span>
                      ) : (
                        <span className="error-text">
                          {prettifyBackendError(inboundResult.message)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="glass-card move">
                <div className="card-header">
                  <h2>
                    <Move size={20} className="icon-accent" />
                    {invT.operations.move.title}
                  </h2>
                  <p className="text-muted">{invT.operations.move.subtitle}</p>
                </div>

                <div className="ht-form">
                  <div className="input-group">
                    <div className="input-wrapper">
                      <input
                        className="operation-barcode-input"
                        type="text"
                        placeholder={invT.operations.move.placeholder}
                        value={moveBarcode}
                        onChange={(e) => setMoveBarcode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const item = inventoryData.find(
                              (i) => i.barcode === moveBarcode,
                            );
                            if (item) {
                              setMovingItem(item);
                              setIsMoveModalOpen(true);
                              setMoveBarcode("");
                            } else {
                              setMoveResult({
                                success: false,
                                message: invT.errors.notFound,
                              });
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setScannerMode("move");
                          setIsScannerOpen(true);
                        }}
                        className="btn-action-ht"
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-primary-ht btn-submit"
                    onClick={() => {
                      const item = inventoryData.find(
                        (i) => i.barcode === moveBarcode,
                      );
                      if (item) {
                        setMovingItem(item);
                        setIsMoveModalOpen(true);
                        setMoveBarcode("");
                      } else {
                        setMoveResult({
                          success: false,
                          message: invT.errors.notFound,
                        });
                      }
                    }}
                  >
                    {invT.operations.move.submit}
                  </button>
                </div>

                {moveResult && (
                  <div
                    className={`operation-result-mini ${moveResult.success ? "success" : "error"}`}
                  >
                    <div className="result-status">
                      {moveResult.success ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                      <span>
                        {moveResult.success
                          ? invT.operations.move.success
                          : invT.operations.move.error}
                      </span>
                    </div>
                    <div className="result-details">
                      {moveResult.success ? (
                        <>
                          <span className="location-badge">
                            → {moveResult.rackCode} [{moveResult.slotX},{" "}
                            {moveResult.slotY}]
                          </span>
                        </>
                      ) : (
                        <span className="error-text">{moveResult.message}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="glass-card outbound">
                <div className="card-header">
                  <h2>
                    <PackageMinus size={20} className="icon-error" />
                    {invT.operations.outbound.title}
                  </h2>
                  <p className="text-muted">
                    {invT.operations.outbound.subtitle}
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleOutbound(e);
                  }}
                  className="ht-form"
                >
                  <div className="input-group">
                    <div className="input-wrapper">
                      <input
                        className="operation-barcode-input"
                        value={outboundBarcode}
                        onChange={(e) => setOutboundBarcode(e.target.value)}
                        placeholder={invT.operations.outbound.placeholder}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setScannerMode("outbound");
                          setIsScannerOpen(true);
                        }}
                        className="btn-action-ht"
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn-primary-ht btn-submit btn-danger"
                  >
                    {invT.operations.outbound.submit}
                  </button>
                </form>

                {outboundResult && (
                  <div
                    className={`operation-result-mini ${outboundResult.success ? "success" : "error"}`}
                  >
                    <div className="result-status">
                      {outboundResult.success ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                      <span>
                        {outboundResult.success
                          ? invT.operations.outbound.success
                          : invT.operations.outbound.error}
                      </span>
                    </div>
                    <div className="result-details">
                      {outboundResult.success
                        ? invT.operations.outbound.details
                        : outboundResult.message}
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

          <Dialog.Content
            className="modal-content"
            aria-describedby="scanner-description"
          >
            <div className="modal-header">
              <Dialog.Title>{invT.scanner.title}</Dialog.Title>
              <Dialog.Description
                id="scanner-description"
                className="visually-hidden"
              >
                {invT.scanner.description}
              </Dialog.Description>
              <Dialog.Close asChild>
                <button className="close-btn">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>

            <div
              id="reader"
              style={{
                width: "100%",
                minHeight: "300px",
                background: "#000",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            ></div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={isImportPreviewModalOpen}
        onOpenChange={setIsImportPreviewModalOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay-ht" />
          <Dialog.Content className="dialog-content-ht import-modal-ht">
            <div className="modal-header">
              <Dialog.Title>
                Import:{" "}
                {importType === "racks"
                  ? invT.import.racksTitle
                  : invT.import.productsTitle}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="close-btn">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>

            <div className="import-preview-container">
              {batchProgress ? (
                <div className="batch-progress-panel">
                  <Spinner size={40} />
                  <p className="progress-title">{invT.import.processing}</p>
                  <p className="progress-count">
                    {batchProgress.current} / {batchProgress.total}
                  </p>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="import-summary-strip">
                    <div className="summary-item">
                      <span className="label">{invT.import.summary.total}</span>
                      <span className="value">{importPreviewData.length}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">{invT.import.summary.new}</span>
                      <span className="value success-text">
                        {
                          importPreviewData.filter((i) => i.status === "new")
                            .length
                        }
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="label">
                        {invT.import.summary.conflicts}
                      </span>
                      <span className="value warning-text">
                        {
                          importPreviewData.filter(
                            (i) => i.status === "conflict",
                          ).length
                        }
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="label">
                        {invT.import.summary.toSave}
                      </span>
                      <span className="value">
                        {
                          importPreviewData.filter((i) => i.action !== "skip")
                            .length
                        }
                      </span>
                    </div>
                  </div>

                  <div className="import-table-wrapper">
                    <table className="import-table">
                      <thead>
                        <tr>
                          <th>{invT.import.table.status}</th>
                          <th>{invT.import.table.code}</th>
                          <th>{invT.import.table.decision}</th>
                          <th>{invT.import.table.action}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreviewData.map((item, idx) => (
                          <tr
                            key={idx}
                            className={
                              selectedPreviewItem === item ? "row-selected" : ""
                            }
                          >
                            <td>
                              <span
                                className={`status-badge ${item.status === "conflict" ? "conflict" : "new"}`}
                              >
                                {item.status === "conflict" ? (
                                  <AlertTriangle size={12} />
                                ) : (
                                  <CheckCircle2 size={12} />
                                )}
                                {item.status === "conflict"
                                  ? invT.import.table.conflict
                                  : invT.import.table.new}
                              </span>
                            </td>
                            <td className="mono-text">
                              {item.data.code || item.data.scanCode}
                            </td>
                            <td>
                              <select
                                value={item.action}
                                onChange={(e) => {
                                  const newData = [...importPreviewData];
                                  newData[idx].action = e.target.value;
                                  setImportPreviewData(newData);
                                }}
                              >
                                {item.status === "conflict" ? (
                                  <>
                                    <option value="skip">
                                      {invT.import.actions.skip}
                                    </option>
                                    <option value="update">
                                      {invT.import.actions.update}
                                    </option>
                                  </>
                                ) : (
                                  <>
                                    <option value="create">
                                      {invT.import.actions.create}
                                    </option>
                                    <option value="skip">
                                      {invT.import.actions.skip}
                                    </option>
                                  </>
                                )}
                              </select>
                            </td>
                            <td>
                              <button
                                className={`btn-action-ht ${selectedPreviewItem === item ? "active" : ""}`}
                                onClick={() =>
                                  setSelectedPreviewItem(
                                    selectedPreviewItem === item ? null : item,
                                  )
                                }
                              >
                                {selectedPreviewItem === item ? (
                                  <X size={16} />
                                ) : (
                                  <Search size={16} />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {selectedPreviewItem && (
                    <div className="diff-view-master-detail">
                      <div className="validation-section">
                        {selectedPreviewItem.validationErrors?.length > 0 && (
                          <div className="validation-warning critical">
                            <div className="warning-header">
                              <AlertTriangle size={18} />{" "}
                              {invT.import.warnings.critical}
                            </div>
                            <ul>
                              {selectedPreviewItem.validationErrors.map(
                                (err: string, i: number) => (
                                  <li key={i}>{err}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="diff-grid">
                        <div className="diff-card">
                          <div className="card-title">
                            <LayoutGrid size={14} /> {invT.import.diff.current}
                          </div>
                          <div className="diff-content">
                            {selectedPreviewItem.existingData ? (
                              Object.entries(
                                selectedPreviewItem.existingData,
                              ).map(([key, val]) => (
                                <div key={key} className="diff-row">
                                  <span className="label">{key}</span>
                                  <span className="value">{String(val)}</span>
                                </div>
                              ))
                            ) : (
                              <div className="no-data-placeholder">
                                {invT.import.diff.noData}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="diff-card changed-data">
                          <div className="card-title">
                            <FileUp size={14} /> {invT.import.diff.csv}
                          </div>
                          <div className="diff-content">
                            {Object.entries(selectedPreviewItem.data).map(
                              ([key, val]) => {
                                const isDifferent =
                                  selectedPreviewItem.existingData &&
                                  String(val) !==
                                    String(
                                      selectedPreviewItem.existingData[key],
                                    );
                                return (
                                  <div key={key} className="diff-row">
                                    <span className="label">{key}</span>
                                    <span
                                      className={`value ${isDifferent ? "changed" : ""}`}
                                    >
                                      {String(val)}
                                    </span>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setIsImportPreviewModalOpen(false)}
              >
                {invT.import.cancel}
              </button>
              <button
                className="btn-primary-ht"
                onClick={handleConfirmImport}
                disabled={!!batchProgress || importPreviewData.length === 0}
              >
                {invT.import.submit.replace(
                  "{count}",
                  importPreviewData
                    .filter((i) => i.action !== "skip")
                    .length.toString(),
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={isImportResultModalOpen}
        onOpenChange={setIsImportResultModalOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay-ht" />
          <Dialog.Content className="dialog-content-ht result-modal-content">
            <div className="modal-header">
              <Dialog.Title>
                <span className="outline-text">IMPORT</span> RESULT
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="btn-ht">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>

            <div className="modal-body">
              <div className="result-stats-grid">
                <div className="stat-card success">
                  <span className="stat-number">
                    {importResult?.successCount}
                  </span>
                  <span className="stat-label">
                    {invT.import.result.successes}
                  </span>
                </div>

                <div className="stat-card error">
                  <span className="stat-number">
                    {importResult?.errorCount}
                  </span>
                  <span className="stat-label">
                    {invT.import.result.failures}
                  </span>
                </div>
              </div>

              {importResult && importResult.errors.length > 0 && (
                <div className="error-details-container">
                  <p className="details-title">
                    <AlertTriangle size={14} /> {invT.import.result.details}
                  </p>
                  <div className="error-scroll-area">
                    <ul>
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-primary-ht"
                onClick={() => setIsImportResultModalOpen(false)}
              >
                {invT.import.close}
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
        existingRacks={racks}
        hasItems={
          editingRack
            ? inventoryData.some((i) => i.rackCode === editingRack.code)
            : false
        }
      />

      <ProductModal
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        onSave={handleSaveProduct}
        editingProduct={editingProduct}
        hasInventoryItems={
          editingProduct
            ? inventoryData.some((i) => i.productId === editingProduct.id)
            : false
        }
      />

      {/* LOADER DLA AI */}
      {aiProcessing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "1rem",
            color: "white",
          }}
        >
          <BrainCircuit
            size={48}
            className="animate-pulse"
            style={{ color: "var(--accent-primary)" }}
          />
          <p style={{ fontFamily: "Space Grotesk", fontSize: "1.2rem" }}>
            Analyzing Image...
          </p>
        </div>
      )}

      <Dialog.Root open={isAiScannerOpen} onOpenChange={setIsAiScannerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="modal-overlay"
            style={{ background: "black" }}
          />
          <Dialog.Content
            className="modal-content"
            style={{
              padding: 0,
              overflow: "hidden",
              background: "#000",
              border: "none",
              maxWidth: "100vw",
              height: "100vh",
              width: "100vw",
            }}
          >
            <CameraSnapshot
              onCapture={handleAiCapture}
              onClose={() => setIsAiScannerOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Tooltip.Provider>
  );
};

export default InventoryContent;
