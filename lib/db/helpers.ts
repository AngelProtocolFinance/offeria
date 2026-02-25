export function projection(fields: string[]) {
  const expression = fields.map((n) => `#${n}`).join(",");
  const names = fields.reduce(
    (prev, curr) => ({ ...prev, [`#${curr}`]: curr }),
    {} as Record<string, string>
  );
  return { expression, names };
}
