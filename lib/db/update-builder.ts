export interface UpdateComps {
  UpdateExpression: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, any>;
}

export class UpdateBuilder {
  private sets: Map<string, string> = new Map();
  private removes: Map<string, string> = new Map();
  private names: Record<string, string> | undefined = undefined;
  private values: Record<string, any> | undefined = undefined;

  set(
    path: string,
    /** caller to decide if nested update or replace */
    value: any
  ): this {
    const parts = path.split(".");
    const placeholder = `:${parts.join("_")}`;
    const aliases = parts.map((part) => `#${part}`);

    // If this path was previously removed, remove it from removes
    this.removes.delete(path);

    this.sets.set(path, `${aliases.join(".")} = ${placeholder}`);
    for (let i = 0; i < parts.length; i++) {
      this.names ||= {};
      this.names[`#${parts[i]}`] = parts[i];
    }
    this.values ||= {};
    this.values[placeholder] = value;
    return this;
  }

  remove(path: string): this {
    // If this path was previously set, remove it from sets and clean up its value
    if (this.sets.has(path)) {
      this.sets.delete(path);
      const parts = path.split(".");
      const placeholder = `:${parts.join("_")}`;
      if (this.values) {
        delete this.values[placeholder];
      }
    }

    // Use regex to split path into tokens that preserve array notation
    const tokens = path.match(/[^.\[]+|\[[^\]]*\]/g) || [];
    const processed_tokens: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.startsWith("[") && token.endsWith("]")) {
        // Array index - add directly without dot separator
        processed_tokens.push(token);
      } else {
        // Property name - create alias and add with dot separator if not first
        const alias = `#${token}`;
        if (processed_tokens.length > 0) {
          processed_tokens.push(".");
        }
        processed_tokens.push(alias);
        this.names ||= {};
        this.names[alias] = token;
      }
    }

    this.removes.set(path, processed_tokens.join(""));
    return this;
  }

  collect(): UpdateComps {
    const set_values = Array.from(this.sets.values());
    const remove_values = Array.from(this.removes.values());

    const exp = [
      ["SET", set_values.join(", ")],
      ["REMOVE", remove_values.join(", ")],
    ]
      .filter((x) => x[1])
      .map((x) => x.join(" "))
      .join(" ");

    return {
      UpdateExpression: exp,
      ...(this.names && { ExpressionAttributeNames: this.names }),
      ...(this.values && { ExpressionAttributeValues: this.values }),
    };
  }
}
