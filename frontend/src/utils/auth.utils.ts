export const decodeTokenPayload = (token: string) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error decoding token", e);
    return null;
  }
};

export const getTokenExpirationTime = (): number | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const payload = decodeTokenPayload(token);
  if (!payload || !payload.exp) return null;

  return payload.exp * 1000;
};

export const isSessionExpired = (): boolean => {
  const expirationTime = getTokenExpirationTime();
  if (!expirationTime) return true;
  return Date.now() >= expirationTime;
};

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
};
