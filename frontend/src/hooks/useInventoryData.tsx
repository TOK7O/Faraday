import { useState, useCallback } from 'react';
import { inventoryApi } from '../api/services/inventoryApi';

export const useInventoryData = () => {
    const [racks, setRacks] = useState([]);
    const [products, setProducts] = useState([]);
    const [inventoryData, setInventoryData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await inventoryApi.fetchInitialData();
            setRacks(data.racks.map((r: any) => ({
                id: r.id, code: r.code, m: r.rows, n: r.columns,
                tempMin: r.minTemperature, tempMax: r.maxTemperature,
                maxWeight: r.maxWeightKg, maxWidth: r.maxItemWidthMm,
                maxHeight: r.maxItemHeightMm, maxDepth: r.maxItemDepthMm, comment: r.comment
            })));
            setProducts(data.products.map((p: any) => ({
                id: p.id, scanCode: p.scanCode, name: p.name, weightKg: p.weightKg,
                widthMm: p.widthMm, heightMm: p.heightMm, depthMm: p.depthMm,
                requiredMinTemp: p.requiredMinTemp, requiredMaxTemp: p.requiredMaxTemp,
                isHazardous: p.isHazardous, photoUrl: p.photoUrl, comment: p.comment || ""
            })));
            setInventoryData(data.inventory);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const performOperation = async (type: 'inbound' | 'outbound', barcode: string) => {
        const result = await inventoryApi.executeOperation(type, barcode);
        if (result.ok) await refreshData();
        return result;
    };

    return { racks, products, inventoryData, isLoading, refreshData, performOperation };
};