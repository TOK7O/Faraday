import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

import { SignInPasswordField } from "@/components/ui/SignInPasswordField";

import { RegisterPasswordFieldPair } from "@/components/ui/RegisterPasswordFieldPair";

import { changePassword } from "@/api/axios";

import { useTranslation } from "@/context/LanguageContext";
import "./PasswordChangeForm.scss";

export const ChangePasswordForm = () => {
  const { t } = useTranslation();
  const securityT: any = t.dashboardPage.content.preferences.security.password;
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fieldConfig = {
    oldPassword: {
      label: securityT.fields.current,
      placeholder: securityT.fields.currentPlaceholder,
      validation: { required: securityT.validation.requiredCurrent },
    },
    newPassword: {
      label: securityT.fields.new,
      placeholder: securityT.fields.newPlaceholder,
      validation: {
        required: securityT.validation.requiredNew,
        tooShort: securityT.validation.tooShort,
        noNumber: securityT.validation.noNumber,
        noSpecialChar: securityT.validation.noSpecial,
      },
    },
    confirmPassword: {
      label: securityT.fields.confirm,
      placeholder: securityT.fields.confirmPlaceholder,
      validation: {
        required: securityT.validation.requiredConfirm,
        mismatch: securityT.validation.mismatch,
      },
    },
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage(null);
    setIsLoading(true);

    const formData = new FormData(form);
    const oldPassword = formData.get("oldPassword") as string;

    // UWAGA: Komponent RegisterPasswordFieldPair używa nazwy "password" dla pierwszego pola
    const newPassword = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: securityT.validation.mismatch });
      setIsLoading(false);
      return;
    }

    try {
      await changePassword(oldPassword, newPassword);
      setMessage({ type: "success", text: securityT.status.success });
      form.reset();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || securityT.status.error;
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="settings-card">
      <div className="settings-header">
        <h3>{securityT.title}</h3>
        <p>{securityT.description}</p>
      </div>

      <Form.Root className="settings-form" onSubmit={handleSubmit}>
        <SignInPasswordField
          data={fieldConfig.oldPassword}
          name="oldPassword"
        />

        <div className="form-divider" />

        <RegisterPasswordFieldPair
          passwordData={fieldConfig.newPassword}
          confirmData={fieldConfig.confirmPassword}
        />

        {message && (
          <div className={`status-banner ${message.type}`}>
            {message.type === "success" ? (
              <CheckCircle size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="form-actions">
          <Form.Submit asChild>
            <button type="submit" className="save-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>{securityT.status.updating}</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>{securityT.updateBtn}</span>
                </>
              )}
            </button>
          </Form.Submit>
        </div>
      </Form.Root>
    </div>
  );
};
