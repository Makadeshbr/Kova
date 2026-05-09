// src/typescript.ts
import { existsSync } from "fs";
import { join } from "path";
var TypeScriptAdapter = {
  name: "typescript",
  detect(projectRoot) {
    return existsSync(join(projectRoot, "package.json")) || existsSync(join(projectRoot, "tsconfig.json"));
  },
  commands: {
    build: "tsc --noEmit",
    test: "vitest run",
    lint: "eslint ."
  },
  parseImports(_filePath, content) {
    return collectImports(content);
  },
  treeSitterLanguage() {
    return "typescript";
  },
  semgrepRuleset() {
    return "p/typescript";
  },
  namingConvention: {
    functions: "camelCase",
    files: "kebab-case",
    classes: "PascalCase"
  }
};
function collectImports(content) {
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[\w*{},\s]+\s+from\s+)?['"]([^'"]+)['"]/gm,
    /\bexport\s+(?:type\s+)?(?:[\w*{},\s]+\s+from\s+)['"]([^'"]+)['"]/gm,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/gm
  ];
  const imports = /* @__PURE__ */ new Set();
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      imports.add(match[1]);
    }
  }
  return [...imports];
}
function detectStructure(projectRoot) {
  const entryPoints = ["src/index.ts", "index.ts", "src/main.ts", "main.ts"];
  const entryPoint = entryPoints.find((ep) => existsSync(join(projectRoot, ep))) ?? null;
  return {
    hasSrc: existsSync(join(projectRoot, "src")),
    hasTests: existsSync(join(projectRoot, "__tests__")) || existsSync(join(projectRoot, "src", "__tests__")),
    entryPoint
  };
}

// src/python.ts
import { existsSync as existsSync2 } from "fs";
import { join as join2 } from "path";
var PythonAdapter = {
  name: "python",
  detect(projectRoot) {
    return existsSync2(join2(projectRoot, "pyproject.toml")) || existsSync2(join2(projectRoot, "setup.py")) || existsSync2(join2(projectRoot, "requirements.txt"));
  },
  commands: {
    build: "python -m py_compile",
    test: "pytest",
    lint: "ruff check ."
  },
  parseImports(_filePath, content) {
    return collectPythonImports(content);
  },
  treeSitterLanguage() {
    return "python";
  },
  semgrepRuleset() {
    return "p/python";
  },
  namingConvention: {
    functions: "snake_case",
    files: "snake_case",
    classes: "PascalCase"
  }
};
function collectPythonImports(content) {
  const imports = /* @__PURE__ */ new Set();
  const importPattern = /^\s*import\s+(.+)$/gm;
  const fromPattern = /^\s*from\s+([A-Za-z_][\w.]*|\.+[A-Za-z_][\w.]*)\s+import\s+/gm;
  let match;
  while ((match = importPattern.exec(content)) !== null) {
    for (const item of match[1].split(",")) {
      const moduleName = item.trim().split(/\s+as\s+/i)[0]?.trim();
      if (moduleName) imports.add(moduleName);
    }
  }
  while ((match = fromPattern.exec(content)) !== null) {
    imports.add(match[1]);
  }
  return [...imports];
}

// src/go.ts
import { existsSync as existsSync3 } from "fs";
import { join as join3 } from "path";
var GoAdapter = {
  name: "go",
  detect(projectRoot) {
    return existsSync3(join3(projectRoot, "go.mod"));
  },
  commands: {
    build: "go build ./...",
    test: "go test ./...",
    lint: "golangci-lint run"
  },
  parseImports(_filePath, content) {
    return collectGoImports(content);
  },
  treeSitterLanguage() {
    return "go";
  },
  semgrepRuleset() {
    return "p/golang";
  },
  namingConvention: {
    functions: "camelCase",
    files: "snake_case",
    classes: "PascalCase"
  }
};
function collectGoImports(content) {
  const imports = /* @__PURE__ */ new Set();
  const singlePattern = /^\s*import\s+(?:[\w.]+\s+)?["`]([^"`]+)["`]/gm;
  const blockPattern = /^\s*import\s*\(([\s\S]*?)\)/gm;
  const blockEntryPattern = /^\s*(?:[\w.]+\s+)?["`]([^"`]+)["`]/gm;
  let match;
  while ((match = singlePattern.exec(content)) !== null) {
    imports.add(match[1]);
  }
  while ((match = blockPattern.exec(content)) !== null) {
    let entry;
    while ((entry = blockEntryPattern.exec(match[1])) !== null) {
      imports.add(entry[1]);
    }
    blockEntryPattern.lastIndex = 0;
  }
  return [...imports];
}

// src/rust.ts
import { existsSync as existsSync4 } from "fs";
import { join as join4 } from "path";
var RustAdapter = {
  name: "rust",
  detect(projectRoot) {
    return existsSync4(join4(projectRoot, "Cargo.toml"));
  },
  commands: {
    build: "cargo build",
    test: "cargo test",
    lint: "cargo clippy -- -D warnings",
    format: "cargo fmt"
  },
  parseImports(_filePath, content) {
    const imports = /* @__PURE__ */ new Set();
    const patterns = [/\buse\s+([\w:]+)/gm, /extern\s+crate\s+(\w+)/gm];
    for (const p of patterns) {
      let m;
      while ((m = p.exec(content)) !== null) imports.add(m[1].split("::")[0]);
    }
    return [...imports];
  },
  treeSitterLanguage() {
    return "rust";
  },
  semgrepRuleset() {
    return "p/rust";
  },
  namingConvention: {
    functions: "snake_case",
    files: "snake_case",
    classes: "PascalCase"
  }
};

// src/jvm.ts
import { existsSync as existsSync5 } from "fs";
import { join as join5 } from "path";
var javaImportRe = /^\s*import\s+([\w.]+)/gm;
function parseJavaImports(content) {
  const imports = /* @__PURE__ */ new Set();
  let m;
  while ((m = javaImportRe.exec(content)) !== null) {
    imports.add(m[1].split(".")[0]);
  }
  return [...imports];
}
var JavaMavenAdapter = {
  name: "java",
  detect(projectRoot) {
    return existsSync5(join5(projectRoot, "pom.xml"));
  },
  commands: {
    build: "mvn compile -q",
    test: "mvn test -q",
    lint: "mvn checkstyle:check -q",
    format: ""
  },
  parseImports: (_f, content) => parseJavaImports(content),
  treeSitterLanguage: () => "java",
  semgrepRuleset: () => "p/java",
  namingConvention: {
    functions: "camelCase",
    files: "PascalCase",
    classes: "PascalCase"
  }
};
var GradleAdapter = {
  name: "kotlin",
  detect(projectRoot) {
    return existsSync5(join5(projectRoot, "build.gradle")) || existsSync5(join5(projectRoot, "build.gradle.kts")) || existsSync5(join5(projectRoot, "settings.gradle.kts"));
  },
  commands: {
    build: "gradle build -q",
    test: "gradle test -q",
    lint: "gradle ktlintCheck -q",
    format: "gradle ktlintFormat -q"
  },
  parseImports: (_f, content) => parseJavaImports(content),
  treeSitterLanguage: () => "kotlin",
  semgrepRuleset: () => "p/kotlin",
  namingConvention: {
    functions: "camelCase",
    files: "PascalCase",
    classes: "PascalCase"
  }
};

// src/dotnet.ts
import { existsSync as existsSync6, readdirSync } from "fs";
import { join as join6 } from "path";
function hasCsproj(projectRoot) {
  try {
    return readdirSync(projectRoot).some((f) => f.endsWith(".csproj") || f.endsWith(".sln"));
  } catch {
    return false;
  }
}
var DotNetAdapter = {
  name: "csharp",
  detect(projectRoot) {
    return existsSync6(join6(projectRoot, "global.json")) || existsSync6(join6(projectRoot, "Directory.Build.props")) || hasCsproj(projectRoot);
  },
  commands: {
    build: "dotnet build -q",
    test: "dotnet test -q",
    lint: "dotnet format --verify-no-changes",
    format: "dotnet format"
  },
  parseImports(_filePath, content) {
    const imports = /* @__PURE__ */ new Set();
    const re = /^\s*using\s+([\w.]+)/gm;
    let m;
    while ((m = re.exec(content)) !== null) imports.add(m[1].split(".")[0]);
    return [...imports];
  },
  treeSitterLanguage() {
    return "c_sharp";
  },
  semgrepRuleset() {
    return "p/csharp";
  },
  namingConvention: {
    functions: "PascalCase",
    files: "PascalCase",
    classes: "PascalCase"
  }
};

// src/scripting.ts
import { existsSync as existsSync7 } from "fs";
import { join as join7 } from "path";
var RubyAdapter = {
  name: "ruby",
  detect(projectRoot) {
    return existsSync7(join7(projectRoot, "Gemfile")) || existsSync7(join7(projectRoot, "Rakefile")) || existsSync7(join7(projectRoot, ".ruby-version"));
  },
  commands: {
    build: "bundle install --quiet",
    test: "bundle exec rspec",
    lint: "bundle exec rubocop -f quiet",
    format: "bundle exec rubocop -a -f quiet"
  },
  parseImports(_filePath, content) {
    const imports = /* @__PURE__ */ new Set();
    const patterns = [/\brequire\s+['"]([^'"]+)['"]/gm, /\brequire_relative\s+['"]([^'"]+)['"]/gm];
    for (const p of patterns) {
      let m;
      while ((m = p.exec(content)) !== null) imports.add(m[1]);
    }
    return [...imports];
  },
  treeSitterLanguage() {
    return "ruby";
  },
  semgrepRuleset() {
    return "p/ruby";
  },
  namingConvention: {
    functions: "snake_case",
    files: "snake_case",
    classes: "PascalCase"
  }
};
var PhpAdapter = {
  name: "php",
  detect(projectRoot) {
    return existsSync7(join7(projectRoot, "composer.json")) || existsSync7(join7(projectRoot, "artisan"));
  },
  commands: {
    build: "composer install -q",
    test: "php vendor/bin/phpunit",
    lint: "php vendor/bin/phpcs",
    format: "php vendor/bin/phpcbf"
  },
  parseImports(_filePath, content) {
    const imports = /* @__PURE__ */ new Set();
    const re = /\buse\s+([\w\\]+)/gm;
    let m;
    while ((m = re.exec(content)) !== null) imports.add(m[1].split("\\")[0]);
    return [...imports];
  },
  treeSitterLanguage() {
    return "php";
  },
  semgrepRuleset() {
    return "p/php";
  },
  namingConvention: {
    functions: "camelCase",
    files: "PascalCase",
    classes: "PascalCase"
  }
};

// src/mobile.ts
import { existsSync as existsSync8 } from "fs";
import { join as join8 } from "path";
var SwiftAdapter = {
  name: "swift",
  detect(projectRoot) {
    return existsSync8(join8(projectRoot, "Package.swift")) || existsSync8(join8(projectRoot, "Podfile"));
  },
  commands: {
    build: "swift build",
    test: "swift test",
    lint: "swiftlint lint --quiet",
    format: "swiftformat ."
  },
  parseImports(_filePath, content) {
    const imports = /* @__PURE__ */ new Set();
    const re = /\bimport\s+(\w+)/gm;
    let m;
    while ((m = re.exec(content)) !== null) imports.add(m[1]);
    return [...imports];
  },
  treeSitterLanguage() {
    return "swift";
  },
  semgrepRuleset() {
    return "p/swift";
  },
  namingConvention: {
    functions: "camelCase",
    files: "PascalCase",
    classes: "PascalCase"
  }
};
var FlutterAdapter = {
  name: "dart",
  detect(projectRoot) {
    return existsSync8(join8(projectRoot, "pubspec.yaml"));
  },
  commands: {
    build: "flutter build apk --debug",
    test: "flutter test",
    lint: "flutter analyze --no-fatal-infos",
    format: "dart format ."
  },
  parseImports(_filePath, content) {
    const imports = /* @__PURE__ */ new Set();
    const re = /\bimport\s+['"]([^'"]+)['"]/gm;
    let m;
    while ((m = re.exec(content)) !== null) imports.add(m[1].split("/")[0]);
    return [...imports];
  },
  treeSitterLanguage() {
    return "dart";
  },
  semgrepRuleset() {
    return "auto";
  },
  namingConvention: {
    functions: "camelCase",
    files: "snake_case",
    classes: "PascalCase"
  }
};

// src/systems.ts
import { existsSync as existsSync9 } from "fs";
import { join as join9 } from "path";
var cIncludeRe = /#include\s+[<"]([^>"]+)[>"]/gm;
function parseCIncludes(content) {
  const imports = /* @__PURE__ */ new Set();
  let m;
  while ((m = cIncludeRe.exec(content)) !== null) {
    imports.add(m[1].replace(/\.(h|hpp)$/, "").split("/")[0]);
  }
  return [...imports];
}
var CppAdapter = {
  name: "cpp",
  detect(projectRoot) {
    return existsSync9(join9(projectRoot, "CMakeLists.txt")) || existsSync9(join9(projectRoot, "meson.build")) || existsSync9(join9(projectRoot, "configure.ac"));
  },
  commands: {
    build: "cmake --build . --parallel",
    test: "ctest --output-on-failure",
    lint: "clang-tidy -p build",
    format: "clang-format -i -r ."
  },
  parseImports: (_f, content) => parseCIncludes(content),
  treeSitterLanguage: () => "cpp",
  semgrepRuleset: () => "p/cpp",
  namingConvention: {
    functions: "snake_case",
    files: "snake_case",
    classes: "PascalCase"
  }
};
var CAdapter = {
  name: "c",
  detect(projectRoot) {
    return (existsSync9(join9(projectRoot, "Makefile")) || existsSync9(join9(projectRoot, "makefile"))) && !existsSync9(join9(projectRoot, "CMakeLists.txt"));
  },
  commands: {
    build: "make",
    test: "make test",
    lint: "make lint",
    format: ""
  },
  parseImports: (_f, content) => parseCIncludes(content),
  treeSitterLanguage: () => "c",
  semgrepRuleset: () => "p/c",
  namingConvention: {
    functions: "snake_case",
    files: "snake_case",
    classes: "PascalCase"
  }
};

// src/generic-adapter.ts
var GenericAdapter = {
  name: "generic",
  detect() {
    return true;
  },
  commands: {
    build: "",
    test: "",
    lint: ""
  },
  parseImports() {
    return [];
  },
  treeSitterLanguage() {
    return "unknown";
  },
  semgrepRuleset() {
    return "auto";
  },
  namingConvention: {
    functions: "camelCase",
    files: "kebab-case",
    classes: "PascalCase"
  }
};

// src/detect.ts
var ADAPTERS = [
  FlutterAdapter,
  // pubspec.yaml (before generic checks)
  SwiftAdapter,
  // Package.swift / Podfile
  DotNetAdapter,
  // .csproj / global.json
  GradleAdapter,
  // build.gradle / settings.gradle.kts
  JavaMavenAdapter,
  // pom.xml
  RustAdapter,
  // Cargo.toml
  GoAdapter,
  // go.mod
  PythonAdapter,
  // pyproject.toml / requirements.txt
  RubyAdapter,
  // Gemfile / Rakefile
  PhpAdapter,
  // composer.json / artisan
  CppAdapter,
  // CMakeLists.txt / meson.build
  TypeScriptAdapter,
  // package.json / tsconfig.json (broad — check after specifics)
  CAdapter
  // Makefile only (fallback for C projects)
];
var ADAPTER_BY_NAME = new Map(
  ADAPTERS.map((adapter) => [adapter.name, adapter])
);
var LANGUAGE_TO_ADAPTER = {
  typescript: "typescript",
  javascript: "typescript",
  go: "go",
  python: "python",
  rust: "rust",
  java: "java",
  kotlin: "gradle",
  csharp: "dotnet",
  php: "php",
  ruby: "ruby",
  swift: "swift",
  dart: "flutter",
  cpp: "cpp",
  c: "c"
};
function detectStack(projectRoot) {
  for (const adapter of ADAPTERS) {
    if (adapter.detect(projectRoot)) return adapter;
  }
  return GenericAdapter;
}
function adapterByName(name) {
  return ADAPTER_BY_NAME.get(name) ?? null;
}
function adapterFromProjectProfile(profile) {
  for (const language of profile.languages) {
    const adapterName = LANGUAGE_TO_ADAPTER[language.name];
    if (!adapterName) continue;
    const adapter = adapterByName(adapterName);
    if (adapter) return adapter;
  }
  return GenericAdapter;
}
function detectStackFromChanges(paths) {
  const exts = new Set(paths.map((p) => {
    const name = p.replace(/\\/g, "/").split("/").at(-1) ?? p;
    const idx = name.lastIndexOf(".");
    return idx > 0 ? name.slice(idx + 1).toLowerCase() : name.toLowerCase();
  }));
  if (exts.has("go") || paths.some((p) => p.endsWith("go.mod"))) return GoAdapter;
  if (exts.has("rs") || paths.some((p) => p.endsWith("Cargo.toml"))) return RustAdapter;
  if (exts.has("py") || paths.some((p) => p.endsWith("requirements.txt"))) return PythonAdapter;
  if (exts.has("ts") || exts.has("tsx")) return TypeScriptAdapter;
  if (exts.has("js") || exts.has("jsx") || exts.has("mjs")) return TypeScriptAdapter;
  if (exts.has("java") || paths.some((p) => p.endsWith("pom.xml"))) return JavaMavenAdapter;
  if (exts.has("kt") || exts.has("kts")) return GradleAdapter;
  if (exts.has("cs") || exts.has("csproj")) return DotNetAdapter;
  if (exts.has("rb") || paths.some((p) => p.endsWith("Gemfile"))) return RubyAdapter;
  if (exts.has("php") || paths.some((p) => p.endsWith("composer.json"))) return PhpAdapter;
  if (exts.has("swift") || paths.some((p) => p.endsWith("Package.swift"))) return SwiftAdapter;
  if (exts.has("dart") || paths.some((p) => p.endsWith("pubspec.yaml"))) return FlutterAdapter;
  if (exts.has("cpp") || exts.has("cc") || exts.has("cxx")) return CppAdapter;
  if (exts.has("c") || exts.has("h")) return CAdapter;
  return null;
}

// src/project-commands.ts
import { existsSync as existsSync10, readFileSync } from "fs";
import { join as join10 } from "path";
function resolveCommands(adapter, projectRoot) {
  const pkgPath = join10(projectRoot, "package.json");
  if (existsSync10(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      return resolveFromPackageJson(pkg, adapter.commands);
    } catch {
      return adapter.commands;
    }
  }
  return detectBuildSystem(projectRoot) ?? adapter.commands;
}
function resolveFromPackageJson(pkg, defaults) {
  const scripts = pkg.scripts ?? {};
  const deps = { ...pkg.devDependencies, ...pkg.dependencies };
  return {
    build: pickBuild(scripts, deps) ?? defaults.build,
    test: pickTest(scripts, deps) ?? defaults.test,
    lint: pickLint(scripts, deps) ?? defaults.lint,
    format: scripts["format"] ?? defaults.format
  };
}
function detectBuildSystem(projectRoot) {
  const has = (f) => existsSync10(join10(projectRoot, f));
  if (has("Cargo.toml")) {
    return { build: "cargo build", test: "cargo test", lint: "cargo clippy -- -D warnings" };
  }
  if (has("go.mod")) {
    return { build: "go build ./...", test: "go test ./...", lint: "staticcheck ./..." };
  }
  if (has("pyproject.toml") || has("setup.py") || has("setup.cfg")) {
    return { build: "python -m build", test: "pytest", lint: "ruff check ." };
  }
  if (has("CMakeLists.txt")) {
    return { build: "cmake --build .", test: "ctest --output-on-failure", lint: "" };
  }
  if (has("build.gradle") || has("build.gradle.kts")) {
    return { build: "gradle build", test: "gradle test", lint: "gradle lint" };
  }
  if (has("pom.xml")) {
    return { build: "mvn compile -q", test: "mvn test -q", lint: "" };
  }
  if (has("Makefile") || has("makefile")) {
    return { build: "make", test: "make test", lint: "make lint" };
  }
  return null;
}
function pickBuild(scripts, deps) {
  if (validScript(scripts["build"]) ?? validScript(scripts["compile"])) return "npm run build";
  if ("next" in deps) return "npx next build";
  if ("vite" in deps) return "npx vite build";
  if ("nuxt" in deps) return "npx nuxt build";
  return void 0;
}
function pickTest(scripts, deps) {
  if (validScript(scripts["test"])) return "npm run test";
  if ("vitest" in deps) return "npx vitest run";
  if ("jest" in deps) return "npx jest --passWithNoTests";
  if ("mocha" in deps) return "npx mocha";
  return void 0;
}
function pickLint(scripts, deps) {
  if (validScript(scripts["lint"])) return "npm run lint";
  if ("@biomejs/biome" in deps || "biome" in deps) return "npx biome lint .";
  if ("eslint" in deps) return "npx eslint .";
  return void 0;
}
function validScript(script) {
  if (!script) return void 0;
  const t = script.trim();
  if (t.startsWith("echo") || t.startsWith("exit")) return void 0;
  return t;
}
export {
  CAdapter,
  CppAdapter,
  DotNetAdapter,
  FlutterAdapter,
  GenericAdapter,
  GoAdapter,
  GradleAdapter,
  JavaMavenAdapter,
  PhpAdapter,
  PythonAdapter,
  RubyAdapter,
  RustAdapter,
  SwiftAdapter,
  TypeScriptAdapter,
  adapterByName,
  adapterFromProjectProfile,
  detectStack,
  detectStackFromChanges,
  detectStructure,
  resolveCommands
};
