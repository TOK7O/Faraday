// import { useState, useCallback } from 'react';
// import { inventoryApi } from '../api/services/inventoryApi';
//
// export const useInventoryData = () => {
//     const [racks, setRacks] = useState<any[]>([]);
//     const [products, setProducts] = useState<any[]>([]);
//     const [inventoryData, setInventoryData] = useState<any[]>([]);
//     const [isLoading, setIsLoading] = useState(false);
//
//     const refreshData = useCallback(async () => {
//         setIsLoading(true);
//         try {
//             const data = await inventoryApi.fetchInitialData();
//
//             setRacks(data.racks.map((r: any) => ({
//                 id: r.id,
//                 code: r.code,
//                 m: r.rows,
//                 n: r.columns,
//                 tempMin: r.minTemperature,
//                 tempMax: r.maxTemperature,
//                 maxWeight: r.maxWeightKg,
//                 maxWidth: r.maxItemWidthMm,
//                 maxHeight: r.maxItemHeightMm,
//                 maxDepth: r.maxItemDepthMm,
//                 comment: r.comment || ""
//             })));
//
//             setProducts(data.products.map((p: any) => ({
//                 id: p.id,
//                 scanCode: p.scanCode,
//                 name: p.name,
//                 weightKg: p.weightKg,
//                 widthMm: p.widthMm,
//                 heightMm: p.heightMm,
//                 depthMm: p.depthMm,
//                 requiredMinTemp: p.requiredMinTemp,
//                 requiredMaxTemp: p.requiredMaxTemp,
//                 tempRequired: (p.requiredMinTemp + p.requiredMaxTemp) / 2,
//                 isHazardous: p.isHazardous,
//                 photoUrl: p.photoUrl || "",
//                 comment: p.comment || ""
//             })));
//
//             setInventoryData(data.inventory || []);
//         } catch (e) {
//             console.error("Błąd podczas odświeżania danych:", e);
//         } finally {
//             setIsLoading(false);
//         }
//     }, []);
//
//     const performOperation = useCallback(async (type: 'inbound' | 'outbound', barcode: string) => {
//         const result = await inventoryApi.executeOperation(type, barcode);
//         if (result.ok) await refreshData();
//         return result;
//     }, [refreshData]);
//
//     const deleteItem = useCallback(async (type: 'Rack' | 'Product', id: number | string) => {
//         const result = await inventoryApi.deleteItem(type, id);
//         if (result.ok) await refreshData();
//         return result;
//     }, [refreshData]);
//
//     const saveItem = useCallback(async (type: 'Rack' | 'Product', dto: any, id?: number) => {
//         const result = await inventoryApi.saveItem(type, dto, id);
//         if (result.ok) await refreshData();
//         return result;
//     }, [refreshData]);
//
//     const moveItem = useCallback(async (dto: any) => {
//         const result = await inventoryApi.moveItem(dto);
//         if (result.ok) await refreshData();
//         return result;
//     }, [refreshData]);
//
//     return {
//         racks, products, inventoryData, isLoading,
//         refreshData, performOperation, deleteItem, saveItem, moveItem
//     };
// };