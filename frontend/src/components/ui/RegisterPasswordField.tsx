import * as Form from "@radix-ui/react-form";
import * as Password from "@radix-ui/react-password-toggle-field";
import { EyeOpenIcon, EyeNoneIcon } from "@radix-ui/react-icons";
interface PasswordFieldProps {
  data: any;
  forgotPasswordLabel?: string;
  name?: string;
  matchPasswordValue?: string;
  onPasswordChange?: (value: string) => void;
}

export const RegisterPasswordField = ({
  data,
  forgotPasswordLabel,
  name = "password",
  matchPasswordValue,
  onPasswordChange,
}: PasswordFieldProps) => {
  const isConfirmField = matchPasswordValue !== undefined;

  return (
    <Form.Field className="FormField" name={name}>
      <div className="FormLabelRow">
        <Form.Label className="FormLabel">
          {data?.label || "Password"}
        </Form.Label>
        <div className="FormMessageContainer">
          <Form.Message className="FormMessage" match="valueMissing">
            {data?.validation?.required}
          </Form.Message>

          {!isConfirmField && (
            <>
              <Form.Message className="FormMessage" match="tooShort">
                {data?.validation?.tooShort}
              </Form.Message>
              <Form.Message
                className="FormMessage"
                match={(v) => v.length > 0 && !/\d/.test(v)}
              >
                {data?.validation?.noNumber}
              </Form.Message>
              <Form.Message
                className="FormMessage"
                match={(v) => v.length > 0 && !/[!@#$%^&*]/.test(v)}
              >
                {data?.validation?.noSpecialChar}
              </Form.Message>
            </>
          )}

          {isConfirmField && (
            <Form.Message
              className="FormMessage"
              match={(value) =>
                value.length > 0 && value !== matchPasswordValue
              }
            >
              {data?.validation?.mismatch}
            </Form.Message>
          )}
        </div>
      </div>

      <Password.Root>
        <div className="PasswordInputContainer">
          <Form.Control asChild>
            <Password.Input
              className="Input"
              placeholder={data?.placeholder}
              required
              minLength={isConfirmField ? undefined : 8}
              onChange={(e) => onPasswordChange?.(e.target.value)}
            />
          </Form.Control>
          <Password.Toggle className="PasswordToggleBtn">
            <Password.Icon visible={<EyeOpenIcon />} hidden={<EyeNoneIcon />} />
          </Password.Toggle>
        </div>
      </Password.Root>

      {forgotPasswordLabel && (
        <div className="ForgotPasswordRow">
          <a href="#" className="LinkSmall">
            {forgotPasswordLabel}
          </a>
        </div>
      )}
    </Form.Field>
  );
};
