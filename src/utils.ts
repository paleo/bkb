export function arr(name: string | string[]): string[] {
  return typeof name === "string" ? [name] : name
}

export function flatten(args: any[]): string[] {
  return args.length === 1 && Array.isArray(args[0]) ? args[0] : args
}