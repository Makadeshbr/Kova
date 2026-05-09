/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'ai.kova.desktop',
  productName: 'Kova',
  copyright: 'Copyright © 2026 Kova',
  directories: { output: 'release', buildResources: 'resources' },
  files: ['out/**/*', '!out/**/*.map'],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'resources/icon.ico',
  },
  mac: {
    target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
    icon: 'resources/icon.icns',
    category: 'public.app-category.developer-tools',
  },
  linux: {
    target: [{ target: 'AppImage', arch: ['x64'] }],
    icon: 'resources/icon.png',
    category: 'Development',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
}
