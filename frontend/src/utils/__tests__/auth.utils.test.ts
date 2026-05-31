import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  decodeTokenPayload,
  getTokenExpirationTime,
  isSessionExpired,
  clearSession,
} from "../auth.utils";

describe("auth.utils", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("decodeTokenPayload", () => {
    it("should decode a valid JWT token payload", () => {
      // Przykład poprawnego tokenu z zakodowanym payloadem: {"sub":"123","name":"John Doe","iat":1516239022}
      const token = "header.eyJzdWIiOiIxMjMiLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE1MTYyMzkwMjJ9.signature";
      const payload = decodeTokenPayload(token);
      expect(payload).toEqual({
        sub: "123",
        name: "John Doe",
        iat: 1516239022,
      });
    });

    it("should return null and log error if token is invalid or malformed", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const token = "invalid-token";
      const payload = decodeTokenPayload(token);
      expect(payload).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("getTokenExpirationTime", () => {
    it("should return null if no token is found in localStorage", () => {
      expect(getTokenExpirationTime()).toBeNull();
    });

    it("should return expiration time in milliseconds if token has 'exp' field", () => {
      const expTimestamp = 1717171717; // w sekundach
      const payload = btoa(JSON.stringify({ exp: expTimestamp }));
      const token = `header.${payload}.signature`;
      localStorage.setItem("token", token);

      expect(getTokenExpirationTime()).toBe(expTimestamp * 1000);
    });

    it("should return null if token does not have 'exp' field", () => {
      const payload = btoa(JSON.stringify({ user: "admin" }));
      const token = `header.${payload}.signature`;
      localStorage.setItem("token", token);

      expect(getTokenExpirationTime()).toBeNull();
    });
  });

  describe("isSessionExpired", () => {
    it("should return true if no token is present", () => {
      expect(isSessionExpired()).toBe(true);
    });

    it("should return true if token is expired", () => {
      const expTimestamp = Math.floor(Date.now() / 1000) - 10; // 10 sekund temu
      const payload = btoa(JSON.stringify({ exp: expTimestamp }));
      const token = `header.${payload}.signature`;
      localStorage.setItem("token", token);

      expect(isSessionExpired()).toBe(true);
    });

    it("should return false if token is not expired", () => {
      const expTimestamp = Math.floor(Date.now() / 1000) + 120; // za 2 minuty
      const payload = btoa(JSON.stringify({ exp: expTimestamp }));
      const token = `header.${payload}.signature`;
      localStorage.setItem("token", token);

      expect(isSessionExpired()).toBe(false);
    });
  });

  describe("clearSession", () => {
    it("should remove token, username, and role from localStorage", () => {
      localStorage.setItem("token", "dummy-token");
      localStorage.setItem("username", "test-user");
      localStorage.setItem("role", "admin");

      clearSession();

      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("username")).toBeNull();
      expect(localStorage.getItem("role")).toBeNull();
    });
  });
});
