import * as Form from "@radix-ui/react-form";
import { EmailField } from "./ui/EmailField";
import { PasswordField } from "./ui/PasswordField";
import "./AuthForm.scss";

const AuthForm = ({ config }: { config: any }) => {
  if (!config) return null;

  const { fields, buttons, footer } = config;
  const emailData = fields?.email || config.email;
  const passwordData = fields?.password || config.password;

  return (
    <Form.Root className="FormRoot">
      <EmailField data={emailData} />

      <PasswordField
        data={passwordData}
        forgotPasswordLabel={buttons?.forgotPassword || "Forgot password?"}
      />

      <Form.Submit asChild>
        <button className="Button" style={{ marginTop: 20 }}>
          {buttons?.submit || "Log In"}
        </button>
      </Form.Submit>

      <div className="FormFooter">
        <span>{footer?.text || "No account?"}</span>
        <a href="#" className="LinkBold">
          {footer?.linkText || "Register"}
        </a>
      </div>
    </Form.Root>
  );
};

export default AuthForm;
