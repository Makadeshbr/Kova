export interface GoldenScenarioExpectation {
  filesCreated?: string[]
  commandsRun?: string[]
  persistentServer?: boolean
  urlDetected?: boolean
  queueUnblocked?: boolean
  validatedOnlyWithEvidence?: boolean
  blockedCauses?: string[]
}

export interface GoldenScenario {
  id: string
  prompt: string
  expectations: GoldenScenarioExpectation
}

export const GOLDEN_SCENARIOS: GoldenScenario[] = [
  {
    id: 'landing-page-install-dev-server',
    prompt: 'Crie uma landing page moderna, rode npm install para mim e depois npm run dev.',
    expectations: {
      filesCreated: ['src/App.tsx'],
      commandsRun: ['npm install', 'npm run dev'],
      persistentServer: true,
      urlDetected: true,
      queueUnblocked: true,
      validatedOnlyWithEvidence: true,
    },
  },
  {
    id: 'claimed-build-without-tool-call',
    prompt: 'Implemente a feature e valide o build.',
    expectations: {
      commandsRun: ['npm run build'],
      validatedOnlyWithEvidence: true,
    },
  },
  {
    id: 'dev-server-port-occupied',
    prompt: 'Rode npm run dev e resolva porta ocupada se acontecer.',
    expectations: {
      commandsRun: ['npm run dev'],
      persistentServer: true,
      blockedCauses: ['port_in_use'],
    },
  },
  {
    id: 'dev-server-node-version-mismatch',
    prompt: 'Rode npm run dev.',
    expectations: {
      commandsRun: ['npm run dev'],
      persistentServer: true,
      blockedCauses: ['node_version_mismatch'],
    },
  },
]
