import { useState, useEffect } from 'react';
import {
    Palette,
    Languages,
    Moon,
    Sun,
    Globe,
    Check,
    Shield,
    Smartphone,
    AlertTriangle
} from 'lucide-react';
import "./PreferencesContent.scss";

import { useTranslation } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { ChangePasswordForm } from "@components/layouts/dashboard/PasswordChangeForm.tsx";

// Define the API URL (adjust if you have a specific config file)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PreferencesContent = () => {
    const { lang, setLang, t } = useTranslation();
    const { theme, toggleTheme } = useTheme();

    // --- 2FA STATE ---
    const [is2faEnabled, setIs2faEnabled] = useState<boolean>(false);
    const [setupData, setSetupData] = useState<{ manualEntryKey: string, qrCodeImage: string } | null>(null);
    const [verifyCode, setVerifyCode] = useState("");
    const [loading2fa, setLoading2fa] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Translations fallback
    const prefT = t.preferences || {
        title: "Preferences",
        description: "Manage your interface settings",
        theme: { title: "Theme", darkMode: "Dark Mode", lightMode: "Light Mode", darkModeDesc: "Dark aesthetic", lightModeDesc: "Bright aesthetic" },
        language: { title: "Language", english: "English", polish: "Polish" }
    };

    // --- 2FA LOGIC ---

    // 1. Check Status on Mount
    useEffect(() => {
        const fetch2faStatus = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const response = await fetch(`${API_URL}/api/Auth/2fa/status`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setIs2faEnabled(data.isEnabled);
                }
            } catch (error) {
                console.error("Failed to fetch 2FA status", error);
            }
        };

        fetch2faStatus();
    }, []);

    // 2. Start Setup (Get QR Code)
    const handleStartSetup = async () => {
        setLoading2fa(true);
        setMessage(null);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/api/Auth/2fa/setup`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to initiate setup");

            const data = await response.json();
            setSetupData(data); // Contains qrCodeImage and manualEntryKey
        } catch (error) {
            setMessage({ type: 'error', text: "Could not generate QR code." });
        } finally {
            setLoading2fa(false);
        }
    };

    // 3. Confirm Setup (Verify Code)
    const handleEnable2fa = async () => {
        setLoading2fa(true);
        setMessage(null);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/api/Auth/2fa/enable`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ code: verifyCode })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || "Verification failed");
            }

            setIs2faEnabled(true);
            setSetupData(null); // Close setup window
            setVerifyCode("");
            setMessage({ type: 'success', text: "Two-Factor Authentication enabled successfully!" });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading2fa(false);
        }
    };

    // 4. Disable 2FA
    const handleDisable2fa = async () => {
        if (!confirm("Are you sure you want to disable 2FA? Your account will be less secure.")) return;

        setLoading2fa(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/api/Auth/2fa/disable`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                setIs2faEnabled(false);
                setMessage({ type: 'success', text: "Two-Factor Authentication disabled." });
            }
        } catch (error) {
            setMessage({ type: 'error', text: "Failed to disable 2FA." });
        } finally {
            setLoading2fa(false);
        }
    };

    // --- THEME LOGIC ---
    const handleThemeChange = (selectedTheme: 'light' | 'dark') => {
        if (theme !== selectedTheme) {
            toggleTheme();
        }
    };

    return (
        <div className="preferences-view">
            <div className="view-header">
                <h2>{prefT.title}</h2>
                <p className="text-muted">{prefT.description}</p>
            </div>

            <div className="preferences-grid">

                {/* --- Theme Section --- */}
                <div className="pref-section">
                    <div className="section-header">
                        <Palette size={20} className="icon-accent" />
                        <h3>{prefT.theme.title}</h3>
                    </div>

                    <div className="options-row">
                        <button
                            className={`option-card ${theme === 'dark' ? 'active' : ''}`}
                            onClick={() => handleThemeChange('dark')}
                        >
                            <div className="card-icon">
                                <Moon size={24} />
                            </div>
                            <div className="card-info">
                                <span className="label">{prefT.theme.darkMode}</span>
                                <span className="sub-label">{prefT.theme.darkModeDesc}</span>
                            </div>
                            {theme === 'dark' && <div className="check-badge"><Check size={14} /></div>}
                        </button>

                        <button
                            className={`option-card ${theme === 'light' ? 'active' : ''}`}
                            onClick={() => handleThemeChange('light')}
                        >
                            <div className="card-icon">
                                <Sun size={24} />
                            </div>
                            <div className="card-info">
                                <span className="label">{prefT.theme.lightMode}</span>
                                <span className="sub-label">{prefT.theme.lightModeDesc}</span>
                            </div>
                            {theme === 'light' && <div className="check-badge"><Check size={14} /></div>}
                        </button>
                    </div>
                </div>

                {/* --- Language Section --- */}
                <div className="pref-section">
                    <div className="section-header">
                        <Languages size={20} className="icon-accent" />
                        <h3>{prefT.language.title}</h3>
                    </div>

                    <div className="options-row">
                        <button
                            className={`option-card ${lang === 'en' ? 'active' : ''}`}
                            onClick={() => setLang('en')}
                        >
                            <div className="card-icon">
                                <Globe size={24} />
                            </div>
                            <div className="card-info">
                                <span className="label">{prefT.language.english}</span>
                            </div>
                            {lang === 'en' && <div className="check-badge"><Check size={14} /></div>}
                        </button>

                        <button
                            className={`option-card ${lang === 'pl' ? 'active' : ''}`}
                            onClick={() => setLang('pl')}
                        >
                            <div className="card-icon">
                                <Globe size={24} />
                            </div>
                            <div className="card-info">
                                <span className="label">{prefT.language.polish}</span>
                            </div>
                            {lang === 'pl' && <div className="check-badge"><Check size={14} /></div>}
                        </button>
                    </div>
                </div>

                {/* --- Security Section --- */}
                <div className="pref-section full-width">
                    <div className="section-header">
                        <Shield size={20} className="icon-accent" />
                        <h3>Security</h3>
                    </div>

                    {/* Change Password Sub-Component */}
                    <div style={{ marginBottom: '2rem' }}>
                        <ChangePasswordForm />
                    </div>

                    {/* 2FA Implementation */}
                    <div className="security-panel">
                        <div className="panel-header">
                            <h4>
                                <Smartphone size={20} />
                                Two-Factor Authentication
                            </h4>
                            <div className={`status-badge ${is2faEnabled ? 'active' : 'inactive'}`}>
                                {is2faEnabled ? <Check size={14} /> : <AlertTriangle size={14} />}
                                <span>{is2faEnabled ? "Enabled" : "Disabled"}</span>
                            </div>
                        </div>

                        {message && (
                            <div style={{
                                color: message.type === 'success' ? '#4ade80' : '#f87171',
                                background: message.type === 'success' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                                padding: '10px', borderRadius: '6px', fontSize: '0.9rem'
                            }}>
                                {message.text}
                            </div>
                        )}

                        <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>
                            Add an extra layer of security to your account by requiring a code from your authenticator app (Google Authenticator, Authy, etc.).
                        </p>

                        {!is2faEnabled && !setupData && (
                            <div>
                                <button
                                    className="btn-primary"
                                    onClick={handleStartSetup}
                                    disabled={loading2fa}
                                >
                                    {loading2fa ? "Loading..." : "Setup 2FA"}
                                </button>
                            </div>
                        )}

                        {/* Setup Mode: QR Code Display */}
                        {setupData && !is2faEnabled && (
                            <div className="setup-area">
                                <div className="qr-container">
                                    <div className="qr-image">
                                        <img src={setupData.qrCodeImage} alt="2FA QR Code" />
                                    </div>
                                    <div className="instructions">
                                        <p>1. Scan this QR code with your authenticator app.</p>
                                        <p>Or enter this key manually:</p>
                                        <div className="secret-key">{setupData.manualEntryKey}</div>

                                        <p style={{ marginTop: '10px' }}>2. Enter the 6-digit code from the app:</p>
                                        <div className="verify-group">
                                            <input
                                                type="text"
                                                maxLength={6}
                                                placeholder="000000"
                                                value={verifyCode}
                                                onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                                            />
                                            <button
                                                className="btn-primary"
                                                onClick={handleEnable2fa}
                                                disabled={loading2fa || verifyCode.length !== 6}
                                            >
                                                {loading2fa ? "Verifying..." : "Enable"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSetupData(null)}
                                    style={{ marginTop: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    Cancel Setup
                                </button>
                            </div>
                        )}

                        {/* Enabled State */}
                        {is2faEnabled && (
                            <div>
                                <button
                                    className="btn-danger"
                                    onClick={handleDisable2fa}
                                    disabled={loading2fa}
                                >
                                    Disable 2FA
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PreferencesContent;

