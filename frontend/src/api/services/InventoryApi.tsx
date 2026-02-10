const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

const getHeaders = () => ({
    "Authorization": `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json"
});

export const inventoryApi = {
    fetchInitialData: async () => {
        const headers = getHeaders();
        const [rR, pR, iR] = await Promise.all([
            fetch(`${API_BASE_URL}/api/Rack`, { headers }),
            fetch(`${API_BASE_URL}/api/Product`, { headers }),
            fetch(`${API_BASE_URL}/api/Report/full-inventory`, { headers })
        ]);
        if (!rR.ok || !pR.ok || !iR.ok) throw new Error("Błąd pobierania danych");
        return { racks: await rR.json(), products: await pR.json(), inventory: await iR.json() };
    },

    executeOperation: async (endpoint: string, barcode: string) => {
        const res = await fetch(`${API_BASE_URL}/api/Operation/${endpoint}`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ barcode })
        });
        const text = await res.text();
        return { ok: res.ok, status: res.status, data: text };
    },

    moveItem: async (dto: any) => {
        const res = await fetch(`${API_BASE_URL}/api/Operation/move`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(dto)
        });
        const text = await res.text();
        return { ok: res.ok, data: text };
    },

    saveItem: async (type: 'Rack' | 'Product', dto: any, id?: number) => {
        const method = id ? "PUT" : "POST";
        const url = id ? `${API_BASE_URL}/api/${type}/${id}` : `${API_BASE_URL}/api/${type}`;
        const res = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(dto)
        });
        const text = await res.text();
        return { ok: res.ok, status: res.status, data: text };
    },

    deleteItem: async (type: 'Rack' | 'Product', id: number | string) => {
        const res = await fetch(`${API_BASE_URL}/api/${type}/${id}`, {
            method: "DELETE",
            headers: getHeaders()
        });
        const text = await res.text();
        return { ok: res.ok, status: res.status, data: text };
    }
};