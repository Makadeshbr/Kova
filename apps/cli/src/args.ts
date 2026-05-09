export function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag)
}

export function readOption(args: string[], name: string, fallback?: string): string | undefined {
  const inline = args.find(arg => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)

  const index = args.indexOf(name)
  if (index >= 0) return args[index + 1] ?? fallback
  return fallback
}

export function positional(args: string[]): string[] {
  const result: string[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      if (!arg.includes('=') && args[i + 1] && !args[i + 1].startsWith('--')) i++
      continue
    }
    result.push(arg)
  }
  return result
}
