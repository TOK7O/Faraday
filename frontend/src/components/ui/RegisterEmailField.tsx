import * as Form from "@radix-ui/react-form";

export const RegisterEmailField = ({ data }: { data: any }) => (
  <Form.Field className="FormField" name="email">
    <div className="FormLabelRow">
      <Form.Label className="FormLabel">{data?.label || "Email"}</Form.Label>
      <div className="FormMessageContainer">
        <Form.Message className="FormMessage" match="valueMissing">
          {data?.validation?.required}
        </Form.Message>
        <Form.Message className="FormMessage" match="typeMismatch">
          {data?.validation?.invalid}
        </Form.Message>
      </div>
    </div>
    <Form.Control asChild>
      <input
        className="Input"
        type="email"
        placeholder={data?.placeholder}
        required
      />
    </Form.Control>
  </Form.Field>
);
