import { spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import chalk from 'chalk'
import { hasFlag, readOption } from '../args'
import { authSessionPath, deleteAuthSession, isAuthSessionExpired, readAuthSession, writeAuthSession, type KovaAuthSession } from '../auth/session'
import type { CliContext } from '../index'

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri?: string
  verification_url?: string
  verification_uri_complete?: string
  expires_in?: number
  interval?: number
}

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
  scope?: string
  base_url?: string
  api_base_url?: string
  llm_base_url?: string
  model?: string
  error?: string
  error_description?: string
}

export async function loginCommand(args: string[], _context: CliContext): Promise<number> {
  const config = loginConfig(args)
  if (config.authUrl && config.tokenUrl && !config.deviceOnly) {
    return browserLogin(config)
  }

  if (!config.deviceUrl || !config.tokenUrl) {
    console.log(chalk.red('OnAuth/OAuth endpoint not configured.'))
    console.log(chalk.dim('Set KOVA_ONAUTH_ISSUER_URL, or set authorization/token endpoints.'))
    console.log(chalk.dim('Browser login: KOVA_ONAUTH_AUTHORIZATION_URL + KOVA_ONAUTH_TOKEN_URL.'))
    console.log(chalk.dim('Device login: KOVA_ONAUTH_DEVICE_CODE_URL + KOVA_ONAUTH_TOKEN_URL.'))
    console.log(chalk.dim('Optional: set KOVA_ONAUTH_LLM_BASE_URL or pass --base-url for the LLM gateway.'))
    return 2
  }

  return deviceLogin(config)
}

async function browserLogin(config: ReturnType<typeof loginConfig>): Promise<number> {
  const verifier = base64Url(randomBytes(32))
  const challenge = base64Url(createHash('sha256').update(verifier).digest())
  const state = base64Url(randomBytes(24))
  const callback = await waitForBrowserCallback(config.redirectPort)
  const redirectUri = callback.redirectUri

  const url = new URL(config.authUrl!)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', config.scope)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  if (config.audience) url.searchParams.set('audience', config.audience)

  console.log(chalk.bold('Kova OnAuth login'))
  console.log(`${chalk.dim('Open')} ${url.toString()}`)
  if (!config.noOpen) openBrowser(url.toString())

  const result = await callback.result
  callback.close()
  if (result.error) throw new Error(result.error)
  if (result.state !== state) throw new Error('OnAuth state mismatch. Login was rejected for safety.')
  if (!result.code) throw new Error('OnAuth callback did not include an authorization code.')

  const token = await exchangeAuthorizationCode(config, result.code, redirectUri, verifier)
  saveTokenSession(config, token)
  return 0
}

async function deviceLogin(config: ReturnType<typeof loginConfig>): Promise<number> {
  const device = await requestDeviceCode(config)
  const verificationUrl = device.verification_uri_complete ?? device.verification_uri ?? device.verification_url
  if (!verificationUrl) throw new Error('OnAuth device response did not include a verification URL.')

  console.log(chalk.bold('Kova OnAuth login'))
  console.log(`${chalk.dim('Open')} ${verificationUrl}`)
  console.log(`${chalk.dim('Code')} ${chalk.bold(device.user_code)}`)
  console.log(chalk.dim(`Waiting for authorization, expires in ${device.expires_in ?? 600}s...`))

  if (!config.noOpen) openBrowser(verificationUrl)

  const token = await pollForToken(config, device)
  saveTokenSession(config, token)
  return 0
}

function saveTokenSession(config: ReturnType<typeof loginConfig>, token: TokenResponse): void {
  if (!token.access_token) throw new Error('OnAuth token response did not include access_token.')
  const now = new Date()
  const account = decodeJwtAccount(token.access_token)
  const session: KovaAuthSession = {
    type: 'oauth',
    provider: 'onauth',
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenType: token.token_type,
    scope: token.scope,
    expiresAt: token.expires_in ? new Date(now.getTime() + token.expires_in * 1000).toISOString() : undefined,
    account,
    baseUrl: config.baseUrl ?? token.llm_base_url ?? token.api_base_url ?? token.base_url,
    model: config.model ?? token.model,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  writeAuthSession(session)
  console.log(chalk.green(`Logged in${account?.email ? ` as ${account.email}` : ''}.`))
  console.log(chalk.dim(`Session saved to ${authSessionPath()}`))
  if (!session.baseUrl) {
    console.log(chalk.yellow('No LLM gateway base URL was saved. Set KOVA_ONAUTH_LLM_BASE_URL or OPENAI_COMPATIBLE_BASE_URL before running tasks.'))
  }
}

export async function logoutCommand(_args: string[], _context: CliContext): Promise<number> {
  const removed = deleteAuthSession()
  console.log(removed ? chalk.green('Logged out.') : chalk.dim('No OnAuth session found.'))
  return 0
}

export async function authCommand(args: string[], context: CliContext): Promise<number> {
  const [subcommand = 'status', ...rest] = args
  if (subcommand === 'login') return loginCommand(rest, context)
  if (subcommand === 'logout') return logoutCommand(rest, context)
  if (subcommand === 'status') {
    printAuthStatus()
    return 0
  }

  console.log(chalk.red(`Unknown auth command: ${subcommand}`))
  console.log(chalk.dim('Usage: kova auth status | kova auth login | kova auth logout'))
  return 2
}

export function currentAuthLabel(): string | null {
  const session = readAuthSession()
  if (!session) return null
  const status = isAuthSessionExpired(session) ? 'expired' : 'active'
  return session.account?.email ? `onauth:${session.account.email} (${status})` : `onauth (${status})`
}

export function hasUsableAuthSession(): boolean {
  const session = readAuthSession()
  return Boolean(session && !isAuthSessionExpired(session))
}

function printAuthStatus(): void {
  const session = readAuthSession()
  if (!session) {
    console.log(chalk.yellow('Not logged in via OnAuth.'))
    console.log(chalk.dim(`Session path: ${authSessionPath()}`))
    return
  }

  console.log(`${chalk.dim('Provider')} OnAuth`)
  console.log(`${chalk.dim('Account')} ${session.account?.email ?? session.account?.name ?? session.account?.id ?? 'unknown'}`)
  console.log(`${chalk.dim('Status')} ${isAuthSessionExpired(session) ? chalk.red('expired') : chalk.green('active')}`)
  console.log(`${chalk.dim('Expires')} ${session.expiresAt ?? 'unknown'}`)
  console.log(`${chalk.dim('Gateway')} ${session.baseUrl ?? process.env.KOVA_ONAUTH_LLM_BASE_URL ?? process.env.OPENAI_COMPATIBLE_BASE_URL ?? 'not configured'}`)
  console.log(`${chalk.dim('Model')} ${process.env.KOVA_LLM_MODEL ?? session.model ?? 'default'}`)
  console.log(`${chalk.dim('Session')} ${authSessionPath()}`)
}

function loginConfig(args: string[]): {
  deviceUrl?: string
  tokenUrl?: string
  authUrl?: string
  clientId: string
  scope: string
  audience?: string
  baseUrl?: string
  model?: string
  noOpen: boolean
  deviceOnly: boolean
  redirectPort?: number
} {
  const issuer = trimSlash(readOption(args, '--issuer') ?? process.env.KOVA_ONAUTH_ISSUER_URL ?? process.env.KOVA_AUTH_ISSUER_URL)
  return {
    authUrl: readOption(args, '--auth-url') ?? process.env.KOVA_ONAUTH_AUTHORIZATION_URL ?? process.env.KOVA_AUTH_AUTHORIZATION_URL ?? (issuer ? `${issuer}/oauth/authorize` : undefined),
    deviceUrl: readOption(args, '--device-url') ?? process.env.KOVA_ONAUTH_DEVICE_CODE_URL ?? process.env.KOVA_AUTH_DEVICE_CODE_URL ?? (issuer ? `${issuer}/oauth/device/code` : undefined),
    tokenUrl: readOption(args, '--token-url') ?? process.env.KOVA_ONAUTH_TOKEN_URL ?? process.env.KOVA_AUTH_TOKEN_URL ?? (issuer ? `${issuer}/oauth/token` : undefined),
    clientId: readOption(args, '--client-id') ?? process.env.KOVA_ONAUTH_CLIENT_ID ?? process.env.KOVA_AUTH_CLIENT_ID ?? 'kova-cli',
    scope: readOption(args, '--scope') ?? process.env.KOVA_ONAUTH_SCOPE ?? process.env.KOVA_AUTH_SCOPE ?? 'openid profile email offline_access',
    audience: readOption(args, '--audience') ?? process.env.KOVA_ONAUTH_AUDIENCE ?? process.env.KOVA_AUTH_AUDIENCE,
    baseUrl: readOption(args, '--base-url') ?? process.env.KOVA_ONAUTH_LLM_BASE_URL,
    model: readOption(args, '--model') ?? process.env.KOVA_LLM_MODEL,
    noOpen: hasFlag(args, '--no-open'),
    deviceOnly: hasFlag(args, '--device-code'),
    redirectPort: numberOption(readOption(args, '--redirect-port') ?? process.env.KOVA_ONAUTH_REDIRECT_PORT),
  }
}

async function requestDeviceCode(config: ReturnType<typeof loginConfig>): Promise<DeviceCodeResponse> {
  const response = await postForm(config.deviceUrl!, {
    client_id: config.clientId,
    scope: config.scope,
    audience: config.audience,
  })
  if (!response.ok) throw new Error(`OnAuth device request failed: ${response.status} ${await response.text()}`)
  return await response.json() as DeviceCodeResponse
}

async function pollForToken(config: ReturnType<typeof loginConfig>, device: DeviceCodeResponse): Promise<TokenResponse> {
  const started = Date.now()
  const expiresMs = (device.expires_in ?? 600) * 1000
  let intervalMs = Math.max(device.interval ?? 5, 1) * 1000

  while (Date.now() - started < expiresMs) {
    await delay(intervalMs)
    const response = await postForm(config.tokenUrl!, {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: device.device_code,
      client_id: config.clientId,
    })
    const body = await response.json().catch(() => ({})) as TokenResponse
    if (response.ok && body.access_token) return body
    if (body.error === 'authorization_pending') continue
    if (body.error === 'slow_down') {
      intervalMs += 5_000
      continue
    }
    if (body.error === 'expired_token') throw new Error('OnAuth login expired before authorization completed.')
    if (body.error === 'access_denied') throw new Error('OnAuth login was denied.')
    throw new Error(body.error_description ?? body.error ?? `OnAuth token request failed: ${response.status}`)
  }

  throw new Error('OnAuth login expired before authorization completed.')
}

async function exchangeAuthorizationCode(
  config: ReturnType<typeof loginConfig>,
  code: string,
  redirectUri: string,
  verifier: string,
): Promise<TokenResponse> {
  const response = await postForm(config.tokenUrl!, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    code_verifier: verifier,
  })
  const body = await response.json().catch(() => ({})) as TokenResponse
  if (!response.ok) throw new Error(body.error_description ?? body.error ?? `OnAuth token request failed: ${response.status}`)
  return body
}

async function postForm(url: string, values: Record<string, string | undefined>): Promise<Response> {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value) body.set(key, value)
  }
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
}

function waitForBrowserCallback(port?: number): Promise<{ redirectUri: string; result: Promise<{ code?: string; state?: string; error?: string }>; close: () => void }> {
  return new Promise((resolve, reject) => {
    let settled = false
    const server = createServer((req, res) => {
      const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host}`)
      if (requestUrl.pathname !== '/callback') {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const code = requestUrl.searchParams.get('code') ?? undefined
      const state = requestUrl.searchParams.get('state') ?? undefined
      const error = requestUrl.searchParams.get('error_description') ?? requestUrl.searchParams.get('error') ?? undefined
      res.writeHead(error ? 400 : 200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(error ? '<h1>Kova login failed</h1><p>You can close this tab.</p>' : '<h1>Kova login complete</h1><p>You can close this tab and return to the terminal.</p>')
      callbackResolve({ code, state, error })
    })

    let callbackResolve!: (value: { code?: string; state?: string; error?: string }) => void
    const result = new Promise<{ code?: string; state?: string; error?: string }>(resolveResult => {
      callbackResolve = resolveResult
    })

    server.on('error', error => {
      if (!settled) reject(error)
    })
    server.listen(port ?? 0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Could not start local OnAuth callback server.'))
        return
      }
      settled = true
      resolve({
        redirectUri: `http://127.0.0.1:${address.port}/callback`,
        result,
        close: () => server.close(),
      })
    })
  })
}

function openBrowser(url: string): void {
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '""', url] : [url]
  const child = spawn(command, args, { detached: true, stdio: 'ignore', shell: false })
  child.unref()
}

function decodeJwtAccount(accessToken: string): KovaAuthSession['account'] {
  const [, payload] = accessToken.split('.')
  if (!payload) return undefined
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(Buffer.from(normalized, 'base64').toString('utf-8')) as Record<string, unknown>
    return {
      id: stringField(json.sub),
      email: stringField(json.email) ?? stringField(json.preferred_username),
      name: stringField(json.name),
    }
  } catch {
    return undefined
  }
}

function base64Url(value: Buffer): string {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function trimSlash(value?: string): string | undefined {
  return value?.replace(/\/+$/, '')
}

function numberOption(value?: string): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
