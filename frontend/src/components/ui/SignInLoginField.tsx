import * as Form from "@radix-ui/react-form";

interface LoginFieldProps {
  data: any;
  name?: string;
}

export const SignInLoginField = ({
  data,
  name = "username",
}: LoginFieldProps) => (
  <Form.Field className="input-group" name={name}>
    <div className="label-row">
      <Form.Label className="ht-label">{data?.label || "Username"}</Form.Label>
      <Form.Message className="error-text" match="valueMissing">
        {data?.validation?.required || "Required"}
      </Form.Message>
    </div>

    <Form.Control asChild>
      <input
        className="ht-input"
        type="text"
        placeholder={data?.placeholder}
        required
        autoComplete="username"
      />
    </Form.Control>
  </Form.Field>
);
