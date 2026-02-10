export const formatMessageNumbers = (msg: string) => {
    if (!msg || typeof msg !== 'string') return msg;
    return msg.replace(/(\.\d*[1-9])0+(?!\d)/g, '$1').replace(/\.0+(?!\d)/g, '');
};

export const prettifyBackendError = (rawMsg: string) => {
    if (!rawMsg) return "Nieznany błąd serwera.";
    const msg = formatMessageNumbers(rawMsg);

    const noRacksMatch = msg.match(/No racks found meeting requirements for '(.*?)' \(Dim: (.*?) mm, Temp: (.*?)°C\)/i);
    if (noRacksMatch) {
        return (
            <div className="pretty-error">
                <p><strong>Brak pasujących regałów</strong> dla produktu <strong>{noRacksMatch[1]}</strong>.</p>
                <div className="error-specs">
                    <span>Wymiary: <strong>{noRacksMatch[2]} mm</strong></span>
                    <span>Wymagana temp: <strong>{noRacksMatch[3]}°C</strong></span>
                </div>
            </div>
        );
    }

    if (msg.includes("No available slots found") && msg.includes("compatible racks")) {
        return (
            <div className="pretty-error">
                <p><strong>Brak wolnego miejsca</strong> w regałach spełniających wymagania techniczne.</p>
            </div>
        );
    }

    const productNotFound = msg.match(/Product with barcode (.*?) not found/i);
    if (productNotFound) {
        return (
            <div className="pretty-error">
                <p><strong>Produkt nieznany</strong> (kod: {productNotFound[1]}).</p>
            </div>
        );
    }

    return <div className="pretty-error">{msg}</div>;
};

export const parseCSV = (text: string, type: 'racks' | 'products', currentRacks: any[], currentProducts: any[], inventoryData: any[]) => {
    const lines = text.split(/\r?\n/);
    const results: any[] = [];
    const normalize = (v: string | undefined) => (!v ? 0 : parseFloat(v.replace(',', '.')) || 0);

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const isHeaderLine = trimmed.toLowerCase().includes('nazwa;') || trimmed.toLowerCase().includes('code;');
        if (trimmed.startsWith("#") && !isHeaderLine) return;

        let cleanLine = trimmed.startsWith("#") ? trimmed.substring(1) : trimmed;
        const parts = cleanLine.split(";").map(p => p.trim());
        if (parts.length < 5) return;

        if (type === 'racks') {
            const [code, rows, cols, tMin, tMax, w, wi, h, d, c] = parts;
            if (code.toLowerCase() === 'code' || !code) return;

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

            const existing = currentRacks.find(r => r.code === rackDto.code);
            const validationErrors: string[] = [];
            if (existing) {
                const rackItems = inventoryData.filter(i => i.rackCode === existing.code);
                const currentTotalWeight = rackItems.reduce((acc, item) => acc + (item.productWeightKg || 0), 0);
                if (currentTotalWeight > rackDto.maxWeightKg) {
                    validationErrors.push(`Błąd nośności: Masa (${currentTotalWeight}kg) przekracza nowy limit.`);
                }
            }
            results.push({ status: existing ? 'conflict' : 'new', data: rackDto, validationErrors, id: existing?.id, action: existing ? 'skip' : 'create' });
        } else {
            const [name, id, photo, tMin, tMax, w, wi, h, d, comment, vDays, isH] = parts;
            if (name.toLowerCase() === 'name' || !id) return;

            const productDto = {
                name, scanCode: id, photoUrl: photo, requiredMinTemp: normalize(tMin), requiredMaxTemp: normalize(tMax),
                weightKg: normalize(w), widthMm: normalize(wi), heightMm: normalize(h), depthMm: normalize(d),
                comment, validityDays: parseInt(vDays) || 0, isHazardous: isH.toLowerCase() === 'true'
            };
            const existing = currentProducts.find(p => p.scanCode === productDto.scanCode);
            results.push({ status: existing ? 'conflict' : 'new', data: productDto, id: existing?.id, action: existing ? 'skip' : 'create' });
        }
    });
    return results;
};