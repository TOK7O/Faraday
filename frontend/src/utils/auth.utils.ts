// src/utils/auth.utils.ts

export const decodeTokenPayload = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding token", e);
        return null;
    }
};

/**
 * Zwraca czas wygaśnięcia tokena w milisekundach (timestamp).
 * Jeśli token nie istnieje lub jest nieprawidłowy, zwraca null.
 */
export const getTokenExpirationTime = (): number | null => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    const payload = decodeTokenPayload(token);
    if (!payload || !payload.exp) return null;

    // exp w JWT jest w sekundach, konwertujemy na milisekundy
    return payload.exp * 1000;
};

/**
 * Sprawdza czy sesja wygasła.
 */
export const isSessionExpired = (): boolean => {
    const expirationTime = getTokenExpirationTime();
    if (!expirationTime) return true; // Brak tokena lub błędny = wygasła
    return Date.now() >= expirationTime;
};

/**
 * Czyści dane sesji (wylogowanie).
 */
export const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
};