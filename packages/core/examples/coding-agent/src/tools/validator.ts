import { Ajv, type ErrorObject, type JSONSchemaType } from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });

export function createInputValidator<T>(
  schema: JSONSchemaType<T> | Record<string, unknown>,
  toolName: string,
): (input: unknown) => T {
  const validate = ajv.compile(schema);

  return (input: unknown): T => {
    const ok = validate(input);
    if (ok) {
      return input as T;
    }

    const details = (validate.errors || [])
      .map((error: ErrorObject) => {
        const path = error.instancePath || "(root)";
        return `${path} ${error.message}`;
      })
      .join("; ");

    throw new Error(`Invalid input for ${toolName}: ${details}`);
  };
}
