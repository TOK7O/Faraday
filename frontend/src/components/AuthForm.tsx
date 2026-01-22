import * as Form from "@radix-ui/react-form";
import { Link } from "react-router-dom";
import "./AuthForm.scss";

interface AuthFormProps {
  config: any;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
}

const AuthForm = ({ config, children, onSubmit }: AuthFormProps) => {
  if (!config) return null;

  const { buttons, footer } = config;

  return (
    <Form.Root className="FormRoot" onSubmit={onSubmit}>
      {children}

      <Form.Submit asChild>
        <button className="Button" style={{ marginTop: "1.25rem" }}>
          {buttons?.submit}
        </button>
      </Form.Submit>

      <div className="FormFooter">
        <span>{footer?.text}</span>
        <Link to={footer?.linkUrl || "#"} className="LinkBold">
          {footer?.linkText}
        </Link>
      </div>
    </Form.Root>
  );
};

export default AuthForm;
