import { emitKeypressEvents } from 'node:readline'
import chalk from 'chalk'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  detail?: string
}

export interface SelectOptions<T extends string = string> {
  title: string
  options: Array<SelectOption<T>>
  initialValue?: T
  emptyMessage?: string
}

export async function selectOption<T extends string>(config: SelectOptions<T>): Promise<T | null> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return null
  if (config.options.length === 0) {
    console.log(chalk.dim(config.emptyMessage ?? 'No options available.'))
    return null
  }

  const previousRaw = process.stdin.isRaw
  let index = Math.max(0, config.options.findIndex(option => option.value === config.initialValue))
  if (index < 0) index = 0

  emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdout.write('\x1B[?25l')

  let renderedLines = 0
  const render = () => {
    clear(renderedLines)
    const lines = buildLines(config, index)
    renderedLines = lines.length
    process.stdout.write(`${lines.join('\n')}\n`)
  }

  return await new Promise<T | null>(resolve => {
    const finish = (value: T | null) => {
      process.stdin.off('keypress', onKey)
      process.stdin.setRawMode(Boolean(previousRaw))
      process.stdout.write('\x1B[?25h')
      clear(renderedLines)
      resolve(value)
    }

    const onKey = (_chunk: string, key: { name?: string; sequence?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === 'c') return finish(null)
      if (key.name === 'escape' || key.name === 'q') return finish(null)
      if (key.name === 'up' || key.name === 'k') {
        index = (index - 1 + config.options.length) % config.options.length
        render()
        return
      }
      if (key.name === 'down' || key.name === 'j') {
        index = (index + 1) % config.options.length
        render()
        return
      }
      if (key.name === 'return') return finish(config.options[index].value)

      const digit = Number(key.sequence)
      if (Number.isInteger(digit) && digit >= 1 && digit <= Math.min(9, config.options.length)) {
        index = digit - 1
        render()
      }
    }

    process.stdin.on('keypress', onKey)
    render()
  })
}

function buildLines<T extends string>(config: SelectOptions<T>, index: number): string[] {
  const width = Math.max(48, Math.min(process.stdout.columns ?? 80, 96))
  const title = ` ${config.title} `
  const top = `${chalk.dim('+')}${chalk.dim(title.padEnd(width - 2, '-'))}${chalk.dim('+')}`
  const bottom = `${chalk.dim('+')}${chalk.dim('up/down move - enter select - esc cancel'.padEnd(width - 2, '-'))}${chalk.dim('+')}`
  const rows = config.options.map((option, itemIndex) => {
    const selected = itemIndex === index
    const prefix = selected ? chalk.black.bgWhite(' > ') : '   '
    const number = chalk.dim(`${itemIndex + 1}. `)
    const detail = option.detail ? chalk.dim(`  ${option.detail}`) : ''
    const raw = `${number}${option.label}${detail}`
    const content = trim(raw, width - 6)
    const padded = content + ' '.repeat(Math.max(0, width - 5 - visibleLength(content)))
    return `${chalk.dim('|')}${prefix}${selected ? chalk.black.bgWhite(padded) : padded}${chalk.dim('|')}`
  })
  return [top, ...rows, bottom]
}

function clear(lines: number): void {
  if (lines <= 0) return
  process.stdout.write(`\x1B[${lines}A`)
  for (let i = 0; i < lines; i++) {
    process.stdout.write('\x1B[2K')
    if (i < lines - 1) process.stdout.write('\x1B[1B')
  }
  process.stdout.write(`\x1B[${Math.max(0, lines - 1)}A`)
}

function trim(value: string, width: number): string {
  return visibleLength(value) > width ? `${stripAnsi(value).slice(0, Math.max(0, width - 1))}.` : value
}

function visibleLength(value: string): number {
  return stripAnsi(value).length
}

function stripAnsi(value: string): string {
  return value.replace(/\x1B\[[0-9;]*m/g, '')
}
