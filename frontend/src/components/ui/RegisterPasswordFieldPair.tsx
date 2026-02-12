import { useState } from "react";
import * as Form from "@radix-ui/react-form";
import * as Password from "@radix-ui/react-password-toggle-field";
import { EyeOpenIcon, EyeNoneIcon } from "@radix-ui/react-icons";
import "./AuthForm.scss";

interface PasswordPairProps {
  passwordData: any;
  confirmData: any;
  onChange?: (password: string, confirm: string) => void;
}

export const RegisterPasswordFieldPair = ({
                                            passwordData,
                                            confirmData,
                                            onChange,
                                          }: PasswordPairProps) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const passwordsMismatch =
      password.length > 0 && confirm.length > 0 && password !== confirm;

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    onChange?.(value, confirm);
  };

  const handleConfirmChange = (value: string) => {
    setConfirm(value);
    onChange?.(password, value);
  };

  return (
      <>
        <Form.Field className="FormField" name="password">
          <div className="FormLabelRow">
            <Form.Label className="FormLabel">{passwordData.label}</Form.Label>
          </div>

          <div className="InputContainer">
            <Password.Root>
              <Form.Control asChild>
                <Password.Input
                    className="Input"
                    required
                    minLength={8}
                    value={password}
                    placeholder={passwordData.placeholder}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                />
              </Form.Control>
              <Password.Toggle className="PasswordToggleBtn">
                <Password.Icon visible={<EyeOpenIcon />} hidden={<EyeNoneIcon />} />
              </Password.Toggle>
            </Password.Root>
          </div>

          <div className="FormMessageContainer">
            <Form.Message className="FormMessage" match="valueMissing">
              {passwordData.validation?.required}
            </Form.Message>
            <Form.Message className="FormMessage" match="tooShort">
              {passwordData.validation?.tooShort}
            </Form.Message>
            <Form.Message className="FormMessage" match={(v) => v.length > 0 && !/\d/.test(v)}>
              {passwordData.validation?.noNumber}
            </Form.Message>
            <Form.Message className="FormMessage" match={(v) => v.length > 0 && !/[!@#$%^&*]/.test(v)}>
              {passwordData.validation?.noSpecialChar}
            </Form.Message>
          </div>
        </Form.Field>

        <Form.Field className="FormField" name="confirmPassword">
          <div className="FormLabelRow">
            <Form.Label className="FormLabel">{confirmData.label}</Form.Label>
          </div>

          <div className="InputContainer">
            <Password.Root>
              <Form.Control asChild>
                <Password.Input
                    className="Input"
                    required
                    value={confirm}
                    placeholder={confirmData.placeholder}
                    onChange={(e) => handleConfirmChange(e.target.value)}
                    data-invalid={passwordsMismatch ? "" : undefined}
                />
              </Form.Control>
              <Password.Toggle className="PasswordToggleBtn">
                <Password.Icon visible={<EyeOpenIcon />} hidden={<EyeNoneIcon />} />
              </Password.Toggle>
            </Password.Root>
          </div>

          <div className="FormMessageContainer">
            <Form.Message className="FormMessage" match="valueMissing">
              {confirmData.validation?.required}
            </Form.Message>

            {passwordsMismatch && (
                <div className="FormMessage">
                  {confirmData.validation?.mismatch}
                </div>
            )}
          </div>
        </Form.Field>
      </>
  );
};