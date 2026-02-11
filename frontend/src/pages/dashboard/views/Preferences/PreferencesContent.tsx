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
import { get2faStatus, setup2fa, enable2fa, disable2fa } from '@/api/axios';

const PreferencesContent = () => {
    const { lang, setLang, t } = useTranslation();
    const { theme, toggleTheme } = useTheme();

    const [is2faEnabled, setIs2faEnabled] = useState<boolean>(false);
    const [setupData, setSetupData] = useState<{ manualEntryKey: string, qrCodeImage: string } | null>(null);
    const [verifyCode, setVerifyCode] = useState("");
    const [loading2fa, setLoading2fa] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const prefT: any = t.dashboardPage.content.preferences;


    useEffect(() => {
        const fetch2faStatus = async () => {
            try {
                const data = await get2faStatus();
                setIs2faEnabled(data.isEnabled);
            } catch (error) {
                console.error("Failed to fetch 2FA status", error);
            }
        };
        fetch2faStatus();
    }, []);

    const handleStartSetup = async () => {
        setLoading2fa(true);
        setMessage(null);
        try {
            const data = await setup2fa();
            setSetupData(data);
        } catch (error) {
            setMessage({ type: 'error', text: prefT.security.twoFactor.messages.setupError });
        } finally {
            setLoading2fa(false);
        }
    };

    const handleEnable2fa = async () => {
        setLoading2fa(true);
        setMessage(null);
        try {
            await enable2fa(verifyCode);
            setIs2faEnabled(true);
            setSetupData(null);
            setVerifyCode("");
            setMessage({ type: 'success', text: prefT.security.twoFactor.messages.enableSuccess });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading2fa(false);
        }
    };

    const handleDisable2fa = async () => {
        if (!confirm(prefT.security.twoFactor.messages.disableConfirm)) return;
        setLoading2fa(true);
        try {
            await disable2fa();
            setIs2faEnabled(false);
            setMessage({ type: 'success', text: prefT.security.twoFactor.messages.disableSuccess });
        } catch (error) {
            setMessage({ type: 'error', text: prefT.security.twoFactor.status.errorGen || "Error" });
        } finally {
            setLoading2fa(false);
        }
    };

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

                <div className="pref-section full-width">
                    <div className="section-header">
                        <Shield size={20} className="icon-accent" />
                        <h3>{prefT.security.title}</h3>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <ChangePasswordForm />
                    </div>

                    <div className="security-panel">
                        <div className="panel-header">
                            <h4>
                                <Smartphone size={20} />
                                {prefT.security.twoFactor.title}
                            </h4>
                            <div className={`status-badge ${is2faEnabled ? 'active' : 'inactive'}`}>
                                {is2faEnabled ? <Check size={14} /> : <AlertTriangle size={14} />}
                                <span>{is2faEnabled ? prefT.security.twoFactor.status.enabled : prefT.security.twoFactor.status.disabled}</span>
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
                            {prefT.security.twoFactor.description}
                        </p>

                        {!is2faEnabled && !setupData && (
                            <div>
                                <button
                                    className="btn-primary"
                                    onClick={handleStartSetup}
                                    disabled={loading2fa}
                                >
                                    {loading2fa ? prefT.security.twoFactor.actions.loading : prefT.security.twoFactor.actions.setup}
                                </button>
                            </div>
                        )}

                        {setupData && !is2faEnabled && (
                            <div className="setup-area">
                                <div className="qr-container">
                                    <div className="qr-image">
                                        <img src={setupData.qrCodeImage} alt="2FA QR Code" />
                                    </div>
                                    <div className="instructions">
                                        <p>{prefT.security.twoFactor.setup.qrStep1}</p>
                                        <p>{prefT.security.twoFactor.setup.manualStep}</p>
                                        <div className="secret-key">{setupData.manualEntryKey}</div>

                                        <p style={{ marginTop: '10px' }}>{prefT.security.twoFactor.setup.verifyStep2}</p>
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
                                                {loading2fa ? prefT.security.twoFactor.actions.verifying : prefT.security.twoFactor.actions.enable}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSetupData(null)}
                                    style={{ marginTop: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    {prefT.security.twoFactor.actions.cancel}
                                </button>
                            </div>
                        )}

                        {is2faEnabled && (
                            <div>
                                <button
                                    className="btn-danger"
                                    onClick={handleDisable2fa}
                                    disabled={loading2fa}
                                >
                                    {prefT.security.twoFactor.actions.disable}
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

