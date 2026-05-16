<!-- Kova - Chat de IA Inteligente -->
<!DOCTYPE html>

<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Kova - AI Chat</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        "colors": {
                "surface-bright": "#333a3d",
                "outline": "#859399",
                "surface": "#0e1417",
                "on-error-container": "#ffdad6",
                "primary": "#a4e6ff",
                "surface-container-highest": "#2f3639",
                "on-surface-variant": "#bbc9cf",
                "surface-tint": "#4cd6ff",
                "on-tertiary-fixed-variant": "#624000",
                "inverse-primary": "#00677f",
                "error": "#ffb4ab",
                "tertiary-fixed-dim": "#ffba49",
                "surface-container-lowest": "#090f12",
                "secondary": "#b9c8de",
                "on-secondary-container": "#a7b6cc",
                "on-secondary": "#233143",
                "on-primary-fixed-variant": "#004e60",
                "tertiary-container": "#feb127",
                "secondary-fixed-dim": "#b9c8de",
                "on-secondary-fixed": "#0d1c2d",
                "inverse-surface": "#dde3e7",
                "on-primary-container": "#00566a",
                "surface-container-low": "#161d1f",
                "surface-dim": "#0e1417",
                "on-secondary-fixed-variant": "#39485a",
                "secondary-container": "#39485a",
                "on-tertiary": "#442b00",
                "surface-variant": "#2f3639",
                "tertiary": "#ffd59c",
                "on-tertiary-container": "#6b4700",
                "on-surface": "#dde3e7",
                "surface-container": "#1a2123",
                "secondary-fixed": "#d4e4fa",
                "on-tertiary-fixed": "#291800",
                "background": "#0e1417",
                "on-error": "#690005",
                "on-primary-fixed": "#001f28",
                "on-background": "#dde3e7",
                "surface-container-high": "#242b2e",
                "tertiary-fixed": "#ffddb1",
                "primary-container": "#00d1ff",
                "inverse-on-surface": "#2b3134",
                "primary-fixed": "#b7eaff",
                "on-primary": "#003543",
                "error-container": "#93000a",
                "primary-fixed-dim": "#4cd6ff",
                "outline-variant": "#3c494e"
        },
        "borderRadius": {
                "DEFAULT": "0.125rem",
                "lg": "0.25rem",
                "xl": "0.5rem",
                "full": "0.75rem"
        },
        "spacing": {
                "unit": "4px",
                "lg": "24px",
                "sm": "8px",
                "gutter": "12px",
                "md": "16px",
                "xl": "48px",
                "xs": "4px",
                "sidebar-width": "260px",
                "margin-desktop": "24px",
                "margin-mobile": "16px",
                "inspector-width": "320px"
        },
        "fontFamily": {
                "body-base": [
                        "Geist"
                ],
                "display-lg": [
                        "Geist"
                ],
                "code-sm": [
                        "JetBrains Mono"
                ],
                "label-xs": [
                        "Geist"
                ],
                "headline-md": [
                        "Geist"
                ],
                "body-sm": ["Geist"],
                "code-md": ["JetBrains Mono"],
                "h1": ["Geist"],
                "body-md": ["Geist"],
                "h2": ["Geist"],
                "label-caps": ["Geist"]
        },
        "fontSize": {
                "body-base": [
                        "15px",
                        {
                                "lineHeight": "1.6",
                                "fontWeight": "400"
                        }
                ],
                "display-lg": [
                        "48px",
                        {
                                "lineHeight": "1.1",
                                "letterSpacing": "-0.02em",
                                "fontWeight": "700"
                        }
                ],
                "code-sm": [
                        "13px",
                        {
                                "lineHeight": "1.5",
                                "fontWeight": "400"
                        }
                ],
                "label-xs": [
                        "11px",
                        {
                                "lineHeight": "1",
                                "letterSpacing": "0.05em",
                                "fontWeight": "600"
                        }
                ],
                "headline-md": [
                        "24px",
                        {
                                "lineHeight": "1.3",
                                "fontWeight": "600"
                        }
                ],
                "body-sm": ["12px", { "lineHeight": "1.5", "fontWeight": "400" }],
                "code-md": ["13px", { "lineHeight": "1.6", "fontWeight": "400" }],
                "h1": ["32px", { "lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "600" }],
                "body-md": ["14px", { "lineHeight": "1.6", "fontWeight": "400" }],
                "h2": ["24px", { "lineHeight": "1.3", "fontWeight": "500" }],
                "label-caps": ["11px", { "lineHeight": "1.2", "letterSpacing": "0.05em", "fontWeight": "600" }]
        }
},
    },
  }
</script>
<style>
        body {
            background-color: #0e1417; /* Level 0 Background */
            color: #dde3e7;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
            background-color: transparent;
        }
        ::-webkit-scrollbar-track {
            background-color: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background-color: transparent;
            border-radius: 4px;
        }
        *:hover::-webkit-scrollbar-thumb {
            background-color: #3c494e; /* Slate Gray equivalent */
        }

        .glass-panel {
            background-color: rgba(22, 29, 31, 0.8); /* Level 2 */
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(164, 230, 255, 0.2);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border-top: 1px solid rgba(164, 230, 255, 0.3); /* top-light highlight */
        }

        .ai-glow {
            box-shadow: 0 0 15px rgba(164, 230, 255, 0.15); /* Electric Cyan glow */
        }

        .input-focus:focus-within {
            border-color: #4cd6ff; /* Cyan */
            box-shadow: 0 0 4px rgba(76, 214, 255, 0.5);
        }
    </style>
</head>
<body class="font-body-md text-body-md h-screen overflow-hidden flex bg-background">
<!-- SideNavBar -->
<nav class="fixed left-0 top-0 bottom-0 z-40 h-full w-sidebar-width flex flex-col bg-surface-container-low dark:bg-surface-container-low border-r border-outline-variant text-primary font-body-sm text-body-sm">
<div class="flex items-center px-6 py-6 border-b border-outline-variant/30">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
<span class="material-symbols-outlined text-on-primary-container" style="font-variation-settings: 'FILL' 1;">terminal</span>
</div>
<div>
<h1 class="font-h2 text-h2 font-bold text-primary leading-none">Kova</h1>
<span class="text-on-surface-variant text-[10px] uppercase tracking-wider">AI IDE</span>
</div>
</div>
</div>
<div class="flex-1 py-4 overflow-y-auto">
<ul class="space-y-1">
<li>
<a class="flex items-center px-6 py-2 gap-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]">folder_open</span>
<span>Explorer</span>
</a>
</li>
<li>
<a class="flex items-center px-6 py-2 gap-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]">search</span>
<span>Search</span>
</a>
</li>
<li>
<a class="flex items-center px-6 py-2 gap-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]">account_tree</span>
<span>Source Control</span>
</a>
</li>
<li>
<a class="flex items-center px-6 py-2 gap-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]">extension</span>
<span>Extensions</span>
</a>
</li>
<li>
<a class="flex items-center px-6 py-2 gap-3 text-primary border-l-2 border-primary bg-surface-container-high hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]">smart_toy</span>
<span class="font-medium">AI</span>
</a>
</li>
</ul>
</div>
<div class="py-4 border-t border-outline-variant/30">
<ul class="space-y-1">
<li>
<a class="flex items-center px-6 py-2 gap-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]">settings</span>
<span>Settings</span>
</a>
</li>
<li>
<a class="flex items-center px-6 py-2 gap-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]">person</span>
<span>Account</span>
</a>
</li>
</ul>
</div>
</nav>
<!-- Main Canvas -->
<main class="flex-1 ml-sidebar-width flex flex-col h-full relative">
<!-- TopAppBar -->
<header class="fixed top-0 right-0 left-sidebar-width z-30 px-margin-desktop justify-between w-full h-12 flex items-center bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant text-primary font-body-md text-body-md">
<nav class="flex items-center gap-6">
<a class="text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100" href="#">File</a>
<a class="text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100" href="#">Edit</a>
<a class="text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100" href="#">Selection</a>
<a class="text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100" href="#">View</a>
<a class="text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100" href="#">Go</a>
</nav>
<div class="flex items-center gap-4 pr-sidebar-width">
<button class="text-on-surface-variant hover:text-primary transition-colors">
<span class="material-symbols-outlined text-[18px]">splitscreen</span>
</button>
<button class="text-on-surface-variant hover:text-primary transition-colors">
<span class="material-symbols-outlined text-[18px]">dock</span>
</button>
<button class="text-on-surface-variant hover:text-primary transition-colors">
<span class="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</header>
<!-- Chat Area -->
<div class="flex-1 mt-12 mb-24 overflow-y-auto px-margin-desktop py-6 max-w-4xl mx-auto w-full">
<div class="flex flex-col gap-6 w-full">
<!-- User Message -->
<div class="flex justify-end w-full">
<div class="bg-surface-container border border-outline-variant/50 rounded-lg rounded-tr-none px-4 py-3 max-w-[80%]">
<p class="text-on-surface">Can you write a React component for a reusable data table that supports sorting and pagination?</p>
</div>
</div>
<!-- AI Response -->
<div class="flex gap-4 w-full">
<div class="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex-shrink-0 flex items-center justify-center mt-1">
<span class="material-symbols-outlined text-primary text-[18px]">smart_toy</span>
</div>
<div class="flex-1 max-w-[90%]">
<div class="glass-panel rounded-xl p-5 ai-glow">
<p class="text-on-surface mb-4">Here is a reusable React data table component that implements sorting and basic pagination logic. It uses Tailwind for styling.</p>
<!-- Code Snippet -->
<div class="bg-[#0e1417] border border-outline-variant/30 rounded-lg overflow-hidden mb-4">
<div class="flex items-center justify-between px-4 py-2 bg-surface-container-low border-b border-outline-variant/30">
<span class="font-body-sm text-body-sm text-on-surface-variant">DataTable.tsx</span>
<button class="text-on-surface-variant hover:text-primary transition-colors">
<span class="material-symbols-outlined text-[16px]">content_copy</span>
</button>
</div>
<div class="p-4 overflow-x-auto">
<pre class="font-code-md text-code-md text-on-surface"><code class="language-typescript">
import React, { useState, useMemo } from 'react';

interface Column&lt;T&gt; {
  key: keyof T;
  label: string;
  sortable?: boolean;
}

interface DataTableProps&lt;T&gt; {
  data: T[];
  columns: Column&lt;T&gt;[];
  itemsPerPage?: number;
}

// ... component implementation
                                    </code></pre>
</div>
</div>
<!-- Action Buttons -->
<div class="flex items-center gap-3 mt-2 border-t border-outline-variant/20 pt-3">
<button class="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded font-body-sm text-body-sm font-medium hover:brightness-110 transition-all duration-100">
<span class="material-symbols-outlined text-[16px]">check</span>
                                    Apply
                                </button>
<button class="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-primary/30 text-primary rounded font-body-sm text-body-sm hover:bg-primary/10 transition-all duration-100">
<span class="material-symbols-outlined text-[16px]">difference</span>
                                    Diff
                                </button>
<button class="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-outline-variant/50 text-on-surface-variant rounded font-body-sm text-body-sm hover:bg-surface-bright transition-all duration-100">
<span class="material-symbols-outlined text-[16px]">info</span>
                                    Explain
                                </button>
</div>
</div>
</div>
</div>
<!-- User Message -->
<div class="flex justify-end w-full">
<div class="bg-surface-container border border-outline-variant/50 rounded-lg rounded-tr-none px-4 py-3 max-w-[80%]">
<p class="text-on-surface">Looks good. Now update it to handle nested object keys for sorting.</p>
</div>
</div>
<!-- AI Thinking State -->
<div class="flex gap-4 w-full opacity-70">
<div class="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex-shrink-0 flex items-center justify-center mt-1">
<span class="material-symbols-outlined text-primary text-[18px] animate-spin">sync</span>
</div>
<div class="flex-1 max-w-[90%]">
<div class="py-2 text-primary font-body-sm text-body-sm flex items-center gap-2">
<span>Thinking...</span>
<span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
<span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse delay-75"></span>
<span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse delay-150"></span>
</div>
</div>
</div>
</div>
</div>
<!-- Floating Prompt Bar -->
<div class="absolute bottom-6 left-0 right-0 px-margin-desktop z-20 flex justify-center pointer-events-none">
<div class="w-full max-w-4xl glass-panel rounded-xl p-3 pointer-events-auto flex flex-col gap-3">
<!-- Quick Commands -->
<div class="flex items-center gap-2 px-1">
<span class="bg-primary/10 text-primary px-2 py-0.5 rounded font-code-md text-[11px] cursor-pointer hover:bg-primary/20 transition-colors">/test</span>
<span class="bg-secondary/10 text-secondary px-2 py-0.5 rounded font-code-md text-[11px] cursor-pointer hover:bg-secondary/20 transition-colors">/fix</span>
<span class="bg-tertiary/10 text-tertiary px-2 py-0.5 rounded font-code-md text-[11px] cursor-pointer hover:bg-tertiary/20 transition-colors">/refactor</span>
</div>
<div class="relative bg-[#0e1417] rounded-lg border border-outline-variant/40 input-focus transition-all duration-200">
<textarea class="w-full bg-transparent border-none text-on-surface placeholder-on-surface-variant font-body-md text-body-md py-3 pl-4 pr-12 resize-none focus:ring-0 max-h-32" placeholder="Ask Kova to code, explain, or refactor..." rows="1"></textarea>
<button class="absolute right-2 bottom-2 w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:brightness-110 transition-all duration-100">
<span class="material-symbols-outlined text-[18px]">send</span>
</button>
</div>
</div>
</div>
</main>
<!-- Footer -->
<footer class="w-full h-6 fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 bg-surface-container dark:bg-surface-container border-t border-outline-variant text-secondary font-label-caps text-label-caps flex flex-row items-center space-x-4 cursor-default">
<div class="flex items-center gap-4">
<span class="text-on-surface-variant">main</span>
<span class="text-on-surface-variant">UTF-8</span>
<span class="text-on-surface-variant">Spaces: 2</span>
<span class="text-on-surface-variant">Prettier</span>
</div>
<div class="text-on-surface-variant/50">
            Kova AI v1.0.4
        </div>
</footer>
</body></html>

<!-- Kova - Configurações do Workspace -->
<!DOCTYPE html>

<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Kova - Workspace Settings</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&amp;family=JetBrains+Mono:ital,wght@0,400;1,400&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        "colors": {
                "surface-bright": "#333a3d",
                "outline": "#859399",
                "surface": "#0e1417",
                "on-error-container": "#ffdad6",
                "primary": "#a4e6ff",
                "surface-container-highest": "#2f3639",
                "on-surface-variant": "#bbc9cf",
                "surface-tint": "#4cd6ff",
                "on-tertiary-fixed-variant": "#624000",
                "inverse-primary": "#00677f",
                "error": "#ffb4ab",
                "tertiary-fixed-dim": "#ffba49",
                "surface-container-lowest": "#090f12",
                "secondary": "#b9c8de",
                "on-secondary-container": "#a7b6cc",
                "on-secondary": "#233143",
                "on-primary-fixed-variant": "#004e60",
                "tertiary-container": "#feb127",
                "secondary-fixed-dim": "#b9c8de",
                "on-secondary-fixed": "#0d1c2d",
                "inverse-surface": "#dde3e7",
                "on-primary-container": "#00566a",
                "surface-container-low": "#161d1f",
                "surface-dim": "#0e1417",
                "on-secondary-fixed-variant": "#39485a",
                "secondary-container": "#39485a",
                "on-tertiary": "#442b00",
                "surface-variant": "#2f3639",
                "tertiary": "#ffd59c",
                "on-tertiary-container": "#6b4700",
                "on-surface": "#dde3e7",
                "surface-container": "#1a2123",
                "secondary-fixed": "#d4e4fa",
                "on-tertiary-fixed": "#291800",
                "background": "#0e1417",
                "on-error": "#690005",
                "on-primary-fixed": "#001f28",
                "on-background": "#dde3e7",
                "surface-container-high": "#242b2e",
                "tertiary-fixed": "#ffddb1",
                "primary-container": "#00d1ff",
                "inverse-on-surface": "#2b3134",
                "primary-fixed": "#b7eaff",
                "on-primary": "#003543",
                "error-container": "#93000a",
                "primary-fixed-dim": "#4cd6ff",
                "outline-variant": "#3c494e"
        },
        "borderRadius": {
                "DEFAULT": "0.125rem",
                "lg": "0.25rem",
                "xl": "0.5rem",
                "full": "0.75rem"
        },
        "spacing": {
                "unit": "4px",
                "lg": "24px",
                "sm": "8px",
                "gutter": "12px",
                "md": "16px",
                "xl": "48px",
                "xs": "4px",
                "sidebar-width": "260px"
        },
        "fontFamily": {
                "body-base": [
                        "Geist"
                ],
                "display-lg": [
                        "Geist"
                ],
                "code-sm": [
                        "JetBrains Mono"
                ],
                "label-xs": [
                        "Geist"
                ],
                "headline-md": [
                        "Geist"
                ]
        },
        "fontSize": {
                "body-base": [
                        "15px",
                        {
                                "lineHeight": "1.6",
                                "fontWeight": "400"
                        }
                ],
                "display-lg": [
                        "48px",
                        {
                                "lineHeight": "1.1",
                                "letterSpacing": "-0.02em",
                                "fontWeight": "700"
                        }
                ],
                "code-sm": [
                        "13px",
                        {
                                "lineHeight": "1.5",
                                "fontWeight": "400"
                        }
                ],
                "label-xs": [
                        "11px",
                        {
                                "lineHeight": "1",
                                "letterSpacing": "0.05em",
                                "fontWeight": "600"
                        }
                ],
                "headline-md": [
                        "24px",
                        {
                                "lineHeight": "1.3",
                                "fontWeight": "600"
                        }
                ]
        }
},
    },
  }
</script>
<style>
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
            background: transparent;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: transparent;
            border-radius: 4px;
        }
        :hover::-webkit-scrollbar-thumb {
            background: #3c494e; /* outline-variant */
        }

        /* Glassmorphism Glow */
        .ai-glow {
            box-shadow: 0 0 15px 0 rgba(164, 230, 255, 0.15); /* Primary color low opacity */
        }

        /* Top Edge Highlight for Cards */
        .card-highlight {
            box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
        }
    </style>
</head>
<body class="bg-surface-dim text-on-surface font-body-base h-screen w-screen overflow-hidden flex selection:bg-primary/30 selection:text-primary">
<!-- SideNavBar -->
<nav class="h-full w-sidebar-width flex flex-col bg-surface-container-low dark:bg-surface-container-low border-r border-outline-variant fixed left-0 top-0 bottom-0 z-40">
<!-- Brand Header -->
<div class="h-16 flex items-center px-lg border-b border-outline-variant border-opacity-50">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-on-primary">
<span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">terminal</span>
</div>
<div>
<h1 class="font-headline-md text-headline-md font-bold text-primary leading-none">Kova</h1>
<span class="text-[13px] text-on-surface-variant">AI IDE</span>
</div>
</div>
</div>
<!-- Main Tabs -->
<div class="flex-1 overflow-y-auto py-4 px-2 space-y-1">
<a class="flex items-center gap-3 px-3 py-2 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]">folder_open</span>
<span class="text-[13px]">Explorer</span>
</a>
<a class="flex items-center gap-3 px-3 py-2 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]">search</span>
<span class="text-[13px]">Search</span>
</a>
<a class="flex items-center gap-3 px-3 py-2 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]">account_tree</span>
<span class="text-[13px]">Source Control</span>
</a>
<a class="flex items-center gap-3 px-3 py-2 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]">extension</span>
<span class="text-[13px]">Extensions</span>
</a>
<a class="flex items-center gap-3 px-3 py-2 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]">smart_toy</span>
<span class="text-[13px]">AI</span>
</a>
</div>
<!-- Footer Tabs -->
<div class="p-2 space-y-1 border-t border-outline-variant border-opacity-50">
<!-- Active State on Settings -->
<a class="flex items-center gap-3 px-3 py-2 rounded-md text-primary border-l-2 border-primary bg-surface-container-high cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">settings</span>
<span class="text-[13px] font-medium">Settings</span>
</a>
<a class="flex items-center gap-3 px-3 py-2 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95" href="#">
<span class="material-symbols-outlined text-[18px]">person</span>
<span class="text-[13px]">Account</span>
</a>
</div>
</nav>
<!-- TopAppBar -->
<header class="w-full h-12 flex items-center bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant fixed top-0 right-0 left-sidebar-width z-30 px-lg justify-between pl-[calc(260px+24px)]">
<div class="flex items-center gap-6">
<nav class="hidden md:flex items-center gap-4">
<a class="font-body-base text-body-base text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100" href="#">File</a>
<a class="font-body-base text-body-base text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100" href="#">Edit</a>
<a class="font-body-base text-body-base text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100" href="#">Selection</a>
<a class="font-body-base text-body-base text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100" href="#">View</a>
<a class="font-body-base text-body-base text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100" href="#">Go</a>
</nav>
</div>
<div class="flex items-center gap-3">
<button class="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors">
<span class="material-symbols-outlined text-[18px]">splitscreen</span>
</button>
<button class="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors">
<span class="material-symbols-outlined text-[18px]">dock</span>
</button>
<button class="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors">
<span class="material-symbols-outlined text-[18px]">more_vert</span>
</button>
</div>
</header>
<!-- Main Workspace Area -->
<main class="flex-1 ml-sidebar-width mt-12 mb-6 flex bg-surface-dim overflow-hidden relative z-10">
<!-- Settings Content (Left/Center) -->
<div class="flex-1 overflow-y-auto p-lg lg:pr-8">
<div class="max-w-4xl mx-auto space-y-12 pb-16">
<!-- Page Header -->
<header class="border-b border-outline-variant pb-6 mb-8">
<h1 class="font-display-lg text-[32px] text-on-surface tracking-tight">Workspace Settings</h1>
<p class="font-body-base text-body-base text-on-surface-variant mt-2 max-w-2xl">Configure your intelligent environment. Preferences automatically sync across your trusted devices.</p>
</header>
<!-- Model Selection (Bento Grid Style) -->
<section class="space-y-4">
<div class="flex items-center justify-between">
<h2 class="font-headline-md text-[24px] text-on-surface">Intelligence Engine</h2>
<span class="px-2 py-1 rounded bg-primary/10 text-primary font-label-xs text-label-xs uppercase">Active Workspace</span>
</div>
<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
<!-- Option 1 -->
<label class="relative flex flex-col p-5 rounded-xl border border-outline-variant bg-surface-container card-highlight cursor-pointer hover:border-primary/50 transition-colors group">
<input class="sr-only peer" name="ai_model" type="radio" value="gpt4o"/>
<div class="absolute inset-0 rounded-xl border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary/5 transition-all pointer-events-none"></div>
<div class="flex justify-between items-start mb-4">
<div class="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-on-surface group-hover:text-primary transition-colors">
<span class="material-symbols-outlined">psychology</span>
</div>
<div class="w-5 h-5 rounded-full border border-outline-variant peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center">
<span class="material-symbols-outlined text-[12px] text-on-primary opacity-0 peer-checked:opacity-100">check</span>
</div>
</div>
<h3 class="font-body-base text-body-base font-medium text-on-surface">GPT-4o</h3>
<p class="text-[13px] text-on-surface-variant mt-1">Balanced logic and reasoning. Best for general refactoring.</p>
</label>
<!-- Option 2 (Active) -->
<label class="relative flex flex-col p-5 rounded-xl border border-outline-variant bg-surface-container card-highlight cursor-pointer hover:border-primary/50 transition-colors group">
<input checked="" class="sr-only peer" name="ai_model" type="radio" value="sonnet"/>
<div class="absolute inset-0 rounded-xl border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary/5 ai-glow transition-all pointer-events-none"></div>
<div class="flex justify-between items-start mb-4">
<div class="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-primary">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">bolt</span>
</div>
<div class="w-5 h-5 rounded-full border border-primary bg-primary flex items-center justify-center">
<span class="material-symbols-outlined text-[12px] text-on-primary">check</span>
</div>
</div>
<h3 class="font-body-base text-body-base font-medium text-on-surface">Claude 3.5 Sonnet</h3>
<p class="text-[13px] text-on-surface-variant mt-1">Exceptional coding capabilities. High context window.</p>
</label>
<!-- Option 3 -->
<label class="relative flex flex-col p-5 rounded-xl border border-outline-variant bg-surface-container card-highlight cursor-pointer hover:border-primary/50 transition-colors group">
<input class="sr-only peer" name="ai_model" type="radio" value="kova"/>
<div class="absolute inset-0 rounded-xl border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary/5 transition-all pointer-events-none"></div>
<div class="flex justify-between items-start mb-4">
<div class="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-on-surface group-hover:text-primary transition-colors">
<span class="material-symbols-outlined">memory</span>
</div>
<div class="w-5 h-5 rounded-full border border-outline-variant peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center">
<span class="material-symbols-outlined text-[12px] text-on-primary opacity-0 peer-checked:opacity-100">check</span>
</div>
</div>
<h3 class="font-body-base text-body-base font-medium text-on-surface">Kova-Pro <span class="ml-2 text-[10px] uppercase tracking-wider bg-secondary/10 text-secondary px-1.5 py-0.5 rounded">Beta</span></h3>
<p class="text-[13px] text-on-surface-variant mt-1">Our proprietary fast-inference model for local operations.</p>
</label>
</div>
</section>
<!-- AI Autocomplete Preferences -->
<section class="space-y-4">
<h2 class="font-headline-md text-[24px] text-on-surface border-b border-outline-variant pb-2">Autocomplete &amp; Context</h2>
<div class="bg-surface-container border border-outline-variant rounded-xl overflow-hidden card-highlight">
<!-- Toggle Row 1 -->
<div class="flex items-center justify-between p-4 border-b border-outline-variant hover:bg-surface-container-low transition-colors">
<div>
<h3 class="font-body-base text-body-base font-medium text-on-surface">Enable Ghost Text</h3>
<p class="text-[13px] text-on-surface-variant">Show inline predictive code suggestions as you type.</p>
</div>
<label class="relative inline-flex items-center cursor-pointer">
<input checked="" class="sr-only peer" type="checkbox" value=""/>
<div class="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
<!-- Toggle Row 2 -->
<div class="flex items-center justify-between p-4 border-b border-outline-variant hover:bg-surface-container-low transition-colors">
<div>
<h3 class="font-body-base text-body-base font-medium text-on-surface">Multi-line Generation</h3>
<p class="text-[13px] text-on-surface-variant">Allow the AI to suggest entire functions or blocks.</p>
</div>
<label class="relative inline-flex items-center cursor-pointer">
<input checked="" class="sr-only peer" type="checkbox" value=""/>
<div class="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
<!-- Toggle Row 3 -->
<div class="flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors">
<div>
<h3 class="font-body-base text-body-base font-medium text-on-surface">Auto-Import Modules</h3>
<p class="text-[13px] text-on-surface-variant">Automatically add missing import statements for AI suggestions.</p>
</div>
<label class="relative inline-flex items-center cursor-pointer">
<input class="sr-only peer" type="checkbox" value=""/>
<div class="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
</div>
</section>
<!-- Font & Editor Settings -->
<section class="space-y-4">
<h2 class="font-headline-md text-[24px] text-on-surface border-b border-outline-variant pb-2">Typography &amp; Editor</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
<!-- Input Group -->
<div class="space-y-2">
<label class="font-label-xs text-label-xs uppercase text-on-surface-variant">Font Family</label>
<div class="relative">
<select class="w-full bg-surface-container-low border border-outline-variant text-on-surface text-sm rounded-lg focus:ring-secondary focus:border-secondary focus:shadow-[0_0_8px_rgba(76,215,246,0.2)] block p-2.5 appearance-none outline-none transition-all">
<option>JetBrains Mono</option>
<option>Fira Code</option>
<option>Geist Mono</option>
<option>Cascadia Code</option>
</select>
<div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-on-surface-variant">
<span class="material-symbols-outlined text-[16px]">expand_more</span>
</div>
</div>
</div>
<!-- Input Group -->
<div class="space-y-2">
<label class="font-label-xs text-label-xs uppercase text-on-surface-variant">Font Size (px)</label>
<input class="w-full bg-surface-container-low border border-outline-variant text-on-surface text-sm rounded-lg focus:ring-secondary focus:border-secondary focus:shadow-[0_0_8px_rgba(76,215,246,0.2)] block p-2.5 outline-none transition-all" type="number" value="13"/>
</div>
<!-- Single Toggle -->
<div class="md:col-span-2 flex items-center justify-between p-4 bg-surface-container border border-outline-variant rounded-xl card-highlight">
<div>
<h3 class="font-body-base text-body-base font-medium text-on-surface">Enable Font Ligatures</h3>
<p class="text-[13px] text-on-surface-variant">Render multi-character symbols natively.</p>
</div>
<label class="relative inline-flex items-center cursor-pointer">
<input checked="" class="sr-only peer" type="checkbox" value=""/>
<div class="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
</div>
</section>
<!-- Action Buttons -->
<div class="pt-6 flex justify-end gap-4 border-t border-outline-variant">
<button class="px-4 py-2 rounded border border-outline-variant text-on-surface hover:bg-surface-container transition-colors text-[13px]">Reset to Defaults</button>
<button class="px-4 py-2 rounded bg-primary text-on-primary hover:brightness-110 transition-all text-[13px] shadow-[0_0_10px_rgba(164,230,255,0.2)]">Save Changes</button>
</div>
</div>
</div>
<!-- Inspector / Preview Panel (Right) -->
<aside class="hidden xl:flex w-[400px] bg-surface-container-lowest border-l border-outline-variant flex-col shrink-0 relative">
<div class="h-12 border-b border-outline-variant flex items-center px-4 shrink-0">
<span class="font-label-xs text-label-xs uppercase text-on-surface-variant flex items-center gap-2">
<span class="material-symbols-outlined text-[16px]">visibility</span>
                    Live Editor Preview
                </span>
</div>
<div class="flex-1 p-4 bg-surface overflow-hidden flex flex-col font-code-sm text-code-sm text-on-surface-variant relative">
<!-- Mac style dots -->
<div class="flex gap-2 mb-4">
<div class="w-3 h-3 rounded-full bg-surface-variant"></div>
<div class="w-3 h-3 rounded-full bg-surface-variant"></div>
<div class="w-3 h-3 rounded-full bg-surface-variant"></div>
</div>
<div class="space-y-1">
<div class="flex"><span class="text-primary mr-2">function</span> <span class="text-tertiary">calculateVector</span>(a, b) {</div>
<div class="flex pl-4">return {</div>
<div class="flex pl-8">x: a.x + b.x,</div>
<div class="flex pl-8">y: a.y + b.y,</div>
<div class="flex pl-8">z: a.z + b.z</div>
<div class="flex pl-4">};</div>
<div class="flex">}</div>
<br/>
<div class="flex"><span class="text-primary mr-2">const</span> result = <span class="text-tertiary">calculateVector</span>(pos1, pos2);</div>
<!-- AI Ghost Text Suggestion -->
<div class="flex relative mt-4">
<span class="text-primary mr-2">const</span> distance =
                        <span class="text-outline italic ml-1 select-none animate-pulse">Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2);</span>
</div>
<!-- Cursor -->
<div class="w-[2px] h-4 bg-primary absolute bottom-[18px] left-[138px] animate-[pulse_1s_step-end_infinite]"></div>
</div>
<!-- Floating AI Badge in Preview -->
<div class="absolute bottom-4 right-4 bg-surface-container-high/80 backdrop-blur-md border border-primary/20 text-primary text-[10px] px-2 py-1 rounded-full flex items-center gap-1 ai-glow">
<span class="material-symbols-outlined text-[12px]">auto_awesome</span>
                    Claude 3.5 Active
                </div>
</div>
</aside>
</main>
<!-- Footer -->
<footer class="w-full h-6 fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 bg-surface-container dark:bg-surface-container border-t border-outline-variant">
<div class="flex flex-row items-center space-x-4">
<span class="font-label-xs text-label-xs uppercase text-on-surface">Kova AI v1.0.4</span>
</div>
<div class="flex flex-row items-center space-x-4">
<a class="font-label-xs text-label-xs uppercase text-on-surface-variant hover:bg-surface-bright cursor-default px-2 rounded" href="#">main</a>
<a class="font-label-xs text-label-xs uppercase text-on-surface-variant hover:bg-surface-bright cursor-default px-2 rounded" href="#">UTF-8</a>
<a class="font-label-xs text-label-xs uppercase text-on-surface-variant hover:bg-surface-bright cursor-default px-2 rounded" href="#">Spaces: 2</a>
<a class="font-label-xs text-label-xs uppercase text-on-surface-variant hover:bg-surface-bright cursor-default px-2 rounded" href="#">Prettier</a>
</div>
</footer>
</body></html>

<!-- Kova - Editor de Código Premium -->
<!DOCTYPE html>

<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Kova - Code Editor</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&amp;family=JetBrains+Mono:ital,wght@0,400;0,700;1,400&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        "colors": {
                "surface-bright": "#333a3d",
                "outline": "#859399",
                "surface": "#0e1417",
                "on-error-container": "#ffdad6",
                "primary": "#a4e6ff",
                "surface-container-highest": "#2f3639",
                "on-surface-variant": "#bbc9cf",
                "surface-tint": "#4cd6ff",
                "on-tertiary-fixed-variant": "#624000",
                "inverse-primary": "#00677f",
                "error": "#ffb4ab",
                "tertiary-fixed-dim": "#ffba49",
                "surface-container-lowest": "#090f12",
                "secondary": "#b9c8de",
                "on-secondary-container": "#a7b6cc",
                "on-secondary": "#233143",
                "on-primary-fixed-variant": "#004e60",
                "tertiary-container": "#feb127",
                "secondary-fixed-dim": "#b9c8de",
                "on-secondary-fixed": "#0d1c2d",
                "inverse-surface": "#dde3e7",
                "on-primary-container": "#00566a",
                "surface-container-low": "#161d1f",
                "surface-dim": "#0e1417",
                "on-secondary-fixed-variant": "#39485a",
                "secondary-container": "#39485a",
                "on-tertiary": "#442b00",
                "surface-variant": "#2f3639",
                "tertiary": "#ffd59c",
                "on-tertiary-container": "#6b4700",
                "on-surface": "#dde3e7",
                "surface-container": "#1a2123",
                "secondary-fixed": "#d4e4fa",
                "on-tertiary-fixed": "#291800",
                "background": "#0e1417",
                "on-error": "#690005",
                "on-primary-fixed": "#001f28",
                "on-background": "#dde3e7",
                "surface-container-high": "#242b2e",
                "tertiary-fixed": "#ffddb1",
                "primary-container": "#00d1ff",
                "inverse-on-surface": "#2b3134",
                "primary-fixed": "#b7eaff",
                "on-primary": "#003543",
                "error-container": "#93000a",
                "primary-fixed-dim": "#4cd6ff",
                "outline-variant": "#3c494e"
        },
        "borderRadius": {
                "DEFAULT": "0.125rem",
                "lg": "0.25rem",
                "xl": "0.5rem",
                "full": "0.75rem"
        },
        "spacing": {
                "unit": "4px",
                "lg": "24px",
                "sm": "8px",
                "gutter": "12px",
                "md": "16px",
                "xl": "48px",
                "xs": "4px",
                "sidebar-width": "260px",
                "inspector-width": "320px",
                "margin-desktop": "24px",
                "margin-mobile": "16px"
        },
        "fontFamily": {
                "body-base": [
                        "Geist"
                ],
                "display-lg": [
                        "Geist"
                ],
                "code-sm": [
                        "JetBrains Mono"
                ],
                "label-xs": [
                        "Geist"
                ],
                "headline-md": [
                        "Geist"
                ],
                "body-sm": [
                        "Geist"
                ],
                "code-md": [
                        "JetBrains Mono"
                ],
                "h1": [
                        "Geist"
                ],
                "body-md": [
                        "Geist"
                ],
                "h2": [
                        "Geist"
                ],
                "label-caps": [
                        "Geist"
                ]
        },
        "fontSize": {
                "body-base": [
                        "15px",
                        {
                                "lineHeight": "1.6",
                                "fontWeight": "400"
                        }
                ],
                "display-lg": [
                        "48px",
                        {
                                "lineHeight": "1.1",
                                "letterSpacing": "-0.02em",
                                "fontWeight": "700"
                        }
                ],
                "code-sm": [
                        "13px",
                        {
                                "lineHeight": "1.5",
                                "fontWeight": "400"
                        }
                ],
                "label-xs": [
                        "11px",
                        {
                                "lineHeight": "1",
                                "letterSpacing": "0.05em",
                                "fontWeight": "600"
                        }
                ],
                "headline-md": [
                        "24px",
                        {
                                "lineHeight": "1.3",
                                "fontWeight": "600"
                        }
                ],
                "body-sm": [
                        "12px",
                        {
                                "lineHeight": "1.5",
                                "fontWeight": "400"
                        }
                ],
                "code-md": [
                        "13px",
                        {
                                "lineHeight": "1.6",
                                "fontWeight": "400"
                        }
                ],
                "h1": [
                        "32px",
                        {
                                "lineHeight": "1.2",
                                "letterSpacing": "-0.02em",
                                "fontWeight": "600"
                        }
                ],
                "body-md": [
                        "14px",
                        {
                                "lineHeight": "1.6",
                                "fontWeight": "400"
                        }
                ],
                "h2": [
                        "24px",
                        {
                                "lineHeight": "1.3",
                                "fontWeight": "500"
                        }
                ],
                "label-caps": [
                        "11px",
                        {
                                "lineHeight": "1.2",
                                "letterSpacing": "0.05em",
                                "fontWeight": "600"
                        }
                ]
        }
},
    },
  }
</script>
<style>
        body {
            background-color: #0e1417;
        }
        .code-keyword { color: #a4e6ff; } /* primary */
        .code-string { color: #b9c8de; } /* secondary */
        .code-function { color: #ffd59c; } /* tertiary */
        .code-comment { color: #859399; font-style: italic; } /* outline */
        .code-tag { color: #00d1ff; } /* primary-container */
        .code-attr { color: #39485a; } /* secondary-container */
        .code-punctuation { color: #dde3e7; } /* on-surface */
        .glass-panel {
            background: rgba(26, 33, 35, 0.8);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(0, 209, 255, 0.2);
        }
        .glass-glow-active {
            box-shadow: 0 0 15px rgba(0, 209, 255, 0.15);
        }
        /* Custom Scrollbar for code editor */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
            background-color: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background-color: transparent;
            border-radius: 4px;
        }
        *:hover::-webkit-scrollbar-thumb {
            background-color: #3c494e; /* outline-variant */
        }
    </style>
</head>
<body class="text-on-surface h-screen overflow-hidden flex flex-col font-body-sm selection:bg-primary-container/30">
<!-- TopAppBar -->
<header class="fixed top-0 right-0 left-sidebar-width z-30 px-margin-desktop justify-between w-full h-12 flex items-center bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant transition-colors pl-[284px]">
<div class="flex items-center space-x-6">
<span class="font-h2 text-h2 font-black text-primary-container">Kova</span>
<nav class="hidden md:flex space-x-4">
<a class="font-body-md text-body-md text-on-surface-variant hover:text-primary-container transition-colors cursor-pointer ease-in duration-100" href="#">File</a>
<a class="font-body-md text-body-md text-on-surface-variant hover:text-primary-container transition-colors cursor-pointer ease-in duration-100" href="#">Edit</a>
<a class="font-body-md text-body-md text-on-surface-variant hover:text-primary-container transition-colors cursor-pointer ease-in duration-100" href="#">Selection</a>
<a class="font-body-md text-body-md text-on-surface-variant hover:text-primary-container transition-colors cursor-pointer ease-in duration-100" href="#">View</a>
<a class="font-body-md text-body-md text-on-surface-variant hover:text-primary-container transition-colors cursor-pointer ease-in duration-100" href="#">Go</a>
</nav>
</div>
<div class="flex items-center space-x-4">
<!-- Search Bar -->
<div class="relative hidden lg:block">
<span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline-variant text-[16px]" data-icon="search">search</span>
<input class="bg-surface-container-low border border-outline-variant text-on-surface rounded font-body-sm text-body-sm pl-8 pr-3 py-1 w-64 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/50 placeholder:text-outline-variant transition-colors" placeholder="Search files, commands..." type="text"/>
</div>
<div class="flex items-center space-x-2 text-on-surface-variant">
<button class="hover:text-primary-container transition-colors p-1 rounded hover:bg-surface-container-high flex items-center justify-center">
<span class="material-symbols-outlined text-[20px]" data-icon="split_screen">splitscreen</span>
</button>
<button class="hover:text-primary-container transition-colors p-1 rounded hover:bg-surface-container-high flex items-center justify-center">
<span class="material-symbols-outlined text-[20px]" data-icon="dock">dock</span>
</button>
<button class="hover:text-primary-container transition-colors p-1 rounded hover:bg-surface-container-high flex items-center justify-center">
<span class="material-symbols-outlined text-[20px]" data-icon="more_vert">more_vert</span>
</button>
</div>
</div>
</header>
<!-- SideNavBar -->
<aside class="fixed left-0 top-0 bottom-0 z-40 h-full w-sidebar-width flex flex-col bg-surface-container-low border-r border-outline-variant">
<!-- Explorer / Main Tab Content -->
<div class="flex-1 flex flex-col overflow-hidden">
<!-- Sidebar Navigation Icons (Far Left Column) -->
<div class="w-12 border-r border-outline-variant flex flex-col items-center py-4 bg-surface-container-lowest absolute left-0 top-0 bottom-0">
<div class="flex flex-col space-y-4 w-full">
<!-- Explorer Tab (Active) -->
<button class="w-full flex justify-center py-2 relative group cursor-pointer active:scale-95 text-primary-container border-l-2 border-primary-container bg-surface-container-high transition-colors duration-100">
<span class="material-symbols-outlined text-[24px]" data-icon="folder_open" data-weight="fill" style="font-variation-settings: 'FILL' 1;">folder_open</span>
</button>
<!-- Search Tab -->
<button class="w-full flex justify-center py-2 relative group cursor-pointer active:scale-95 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100">
<span class="material-symbols-outlined text-[24px]" data-icon="search">search</span>
</button>
<!-- Source Control Tab -->
<button class="w-full flex justify-center py-2 relative group cursor-pointer active:scale-95 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100">
<span class="material-symbols-outlined text-[24px]" data-icon="account_tree">account_tree</span>
</button>
<!-- Extensions Tab -->
<button class="w-full flex justify-center py-2 relative group cursor-pointer active:scale-95 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100">
<span class="material-symbols-outlined text-[24px]" data-icon="extension">extension</span>
</button>
<!-- AI Tab -->
<button class="w-full flex justify-center py-2 relative group cursor-pointer active:scale-95 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100">
<span class="material-symbols-outlined text-[24px]" data-icon="smart_toy">smart_toy</span>
</button>
</div>
<div class="mt-auto flex flex-col space-y-4 w-full mb-8">
<!-- Settings Tab -->
<button class="w-full flex justify-center py-2 relative group cursor-pointer active:scale-95 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100">
<span class="material-symbols-outlined text-[24px]" data-icon="settings">settings</span>
</button>
<!-- Account Tab -->
<button class="w-full flex justify-center py-2 relative group cursor-pointer active:scale-95 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100">
<span class="material-symbols-outlined text-[24px]" data-icon="person">person</span>
</button>
</div>
</div>
<!-- Explorer Panel Content -->
<div class="pl-12 w-full h-full flex flex-col bg-surface-container">
<div class="px-4 py-3 flex items-center justify-between">
<span class="font-label-caps text-label-caps text-on-surface">EXPLORER</span>
<button class="text-on-surface-variant hover:text-primary-container"><span class="material-symbols-outlined text-[16px]" data-icon="more_horiz">more_horiz</span></button>
</div>
<div class="flex-1 overflow-y-auto px-2 font-body-sm text-body-sm text-on-surface-variant">
<!-- Folder: KOVA-UI -->
<div class="flex items-center py-1 cursor-pointer hover:bg-surface-container-high rounded px-2">
<span class="material-symbols-outlined text-[16px] mr-2" data-icon="keyboard_arrow_down">keyboard_arrow_down</span>
<span class="font-semibold text-on-surface">KOVA-UI</span>
</div>
<!-- Subfolder: src -->
<div class="flex items-center py-1 cursor-pointer hover:bg-surface-container-high rounded px-2 pl-6">
<span class="material-symbols-outlined text-[16px] mr-2" data-icon="keyboard_arrow_down">keyboard_arrow_down</span>
<span class="material-symbols-outlined text-[16px] mr-2 text-primary-container" data-icon="folder">folder</span>
<span>src</span>
</div>
<!-- Files -->
<div class="flex items-center py-1 cursor-pointer hover:bg-surface-container-high rounded px-2 pl-10">
<span class="material-symbols-outlined text-[16px] mr-2 text-secondary" data-icon="description">description</span>
<span>App.tsx</span>
</div>
<div class="flex items-center py-1 cursor-pointer hover:bg-surface-container-high rounded px-2 pl-10 bg-primary-container/10 text-primary-container border-l border-primary-container">
<span class="material-symbols-outlined text-[16px] mr-2 text-secondary" data-icon="description">description</span>
<span>CodeEditor.tsx</span>
</div>
<div class="flex items-center py-1 cursor-pointer hover:bg-surface-container-high rounded px-2 pl-10">
<span class="material-symbols-outlined text-[16px] mr-2 text-tertiary" data-icon="css">css</span>
<span>globals.css</span>
</div>
<div class="flex items-center py-1 cursor-pointer hover:bg-surface-container-high rounded px-2 pl-10">
<span class="material-symbols-outlined text-[16px] mr-2 text-outline" data-icon="settings">settings</span>
<span>utils.ts</span>
</div>
</div>
</div>
</div>
</aside>
<!-- Main Workspace -->
<main class="flex-1 flex pt-12 pl-[260px] pb-6 bg-surface">
<!-- Code Editor Area -->
<div class="flex-1 flex flex-col min-w-0 border-r border-outline-variant/30">
<!-- Editor Tabs -->
<div class="flex h-9 bg-surface-container-low border-b border-outline-variant/30 overflow-x-auto no-scrollbar">
<div class="flex items-center px-4 py-2 bg-surface border-t-2 border-primary-container text-on-surface font-body-sm text-body-sm cursor-pointer min-w-max">
<span class="material-symbols-outlined text-[16px] mr-2 text-secondary" data-icon="description">description</span>
                    CodeEditor.tsx
                    <span class="material-symbols-outlined text-[14px] ml-2 text-outline-variant hover:text-on-surface rounded-full hover:bg-surface-container-high" data-icon="close">close</span>
</div>
<div class="flex items-center px-4 py-2 text-on-surface-variant font-body-sm text-body-sm cursor-pointer hover:bg-surface-container-high min-w-max">
<span class="material-symbols-outlined text-[16px] mr-2 text-tertiary" data-icon="css">css</span>
                    globals.css
                </div>
</div>
<!-- Code Content -->
<div class="flex-1 overflow-auto bg-surface p-4 font-code-md text-code-md leading-[1.6]">
<div class="flex">
<!-- Line Numbers -->
<div class="text-outline-variant/50 text-right pr-4 select-none flex flex-col">
<span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span><span>15</span><span>16</span><span>17</span><span>18</span><span>19</span><span>20</span><span>21</span>
</div>
<!-- Code Lines -->
<div class="flex-1 whitespace-pre">
<span class="code-keyword">import</span> React, { useState, useEffect } <span class="code-keyword">from</span> <span class="code-string">'react'</span><span class="code-punctuation">;</span>
<span class="code-keyword">import</span> { highlightSyntax } <span class="code-keyword">from</span> <span class="code-string">'@kova/highlight'</span><span class="code-punctuation">;</span>
<span class="code-keyword">interface</span> <span class="code-function">CodeEditorProps</span> {
  initialCode: <span class="code-keyword">string</span><span class="code-punctuation">;</span>
  language: <span class="code-keyword">string</span><span class="code-punctuation">;</span>
  readOnly?: <span class="code-keyword">boolean</span><span class="code-punctuation">;</span>
}

<span class="code-keyword">export</span> <span class="code-keyword">const</span> <span class="code-function">CodeEditor</span>: React.FC&lt;<span class="code-function">CodeEditorProps</span>&gt; = ({ initialCode, language, readOnly }) <span class="code-keyword">=&gt;</span> {
  <span class="code-keyword">const</span> [code, setCode] = <span class="code-function">useState</span>(initialCode)<span class="code-punctuation">;</span>
<span class="code-comment">// AI suggestions will be injected here during streaming</span>
<span class="code-keyword">const</span> aiSuggestion = <span class="code-string">"/* Generating optimized refactor... */"</span><span class="code-punctuation">;</span>
<span class="code-keyword">return</span> (
    &lt;<span class="code-tag">div</span> <span class="code-attr">className</span>=<span class="code-string">"relative w-full h-full bg-surface text-on-surface"</span>&gt;
      &lt;<span class="code-tag">textarea</span>
<span class="code-attr">value</span>={code}
        <span class="code-attr">onChange</span>={(e) =&gt; <span class="code-function">setCode</span>(e.target.value)}
        <span class="code-attr">readOnly</span>={readOnly}
        <span class="code-attr">className</span>=<span class="code-string">"absolute inset-0 w-full h-full p-4 font-mono text-sm bg-transparent outline-none resize-none"</span>
      /&gt;
    &lt;/<span class="code-tag">div</span>&gt;
  )<span class="code-punctuation">;</span>
}
                    </div>
</div>
</div>
<!-- Integrated Terminal -->
<div class="h-48 border-t border-outline-variant/30 bg-surface-container flex flex-col">
<div class="flex h-8 bg-surface-container-low border-b border-outline-variant/30 items-center px-4 font-body-sm text-body-sm space-x-6">
<span class="text-on-surface border-b-2 border-primary-container py-1 cursor-pointer">Terminal</span>
<span class="text-on-surface-variant hover:text-on-surface cursor-pointer">Output</span>
<span class="text-on-surface-variant hover:text-on-surface cursor-pointer">Problems <span class="bg-primary-container/10 text-primary-container px-1.5 rounded-full text-[10px] ml-1">0</span></span>
<span class="text-on-surface-variant hover:text-on-surface cursor-pointer">Debug Console</span>
</div>
<div class="flex-1 p-3 font-code-md text-code-md text-on-surface-variant overflow-y-auto">
<div><span class="text-secondary">➜</span> <span class="text-tertiary">kova-ui</span> git:(<span class="text-error">main</span>) <span class="text-primary-container">✗</span> npm run dev</div>
<br/>
<div>&gt; kova-ui@1.0.0 dev</div>
<div>&gt; vite</div>
<br/>
<div class="text-secondary">  VITE v4.4.9  ready in 234 ms</div>
<br/>
<div>  ➜  Local:   <span class="text-primary-container hover:underline cursor-pointer">http://localhost:5173/</span></div>
<div>  ➜  Network: use --host to expose</div>
<div>  ➜  press h to show help</div>
</div>
</div>
</div>
<!-- Right Inspector (AI Panel) -->
<aside class="w-inspector-width bg-surface-container flex flex-col h-full border-l border-outline-variant/30 shrink-0">
<!-- Header -->
<div class="h-12 border-b border-outline-variant/30 flex items-center justify-between px-4 bg-surface-container-lowest/50">
<div class="flex items-center text-primary-container font-body-md font-semibold">
<span class="material-symbols-outlined mr-2" data-icon="smart_toy">smart_toy</span>
                    Kova AI
                </div>
<div class="flex items-center space-x-2 text-on-surface-variant">
<button class="hover:text-on-surface"><span class="material-symbols-outlined text-[18px]" data-icon="history">history</span></button>
<button class="hover:text-on-surface"><span class="material-symbols-outlined text-[18px]" data-icon="more_horiz">more_horiz</span></button>
</div>
</div>
<!-- Chat History -->
<div class="flex-1 overflow-y-auto p-4 space-y-6">
<!-- User Message -->
<div class="flex flex-col items-end">
<div class="bg-surface-container-highest px-3 py-2 rounded-lg rounded-tr-sm text-body-sm text-on-surface max-w-[90%]">
                        How can I optimize the state management in <span class="font-code-md text-primary-container bg-primary-container/10 px-1 rounded text-[11px]">CodeEditor.tsx</span>? It feels a bit sluggish when typing fast.
                    </div>
<span class="text-[10px] text-outline-variant mt-1">2 mins ago</span>
</div>
<!-- AI Response -->
<div class="flex flex-col items-start glass-panel p-3 rounded-lg rounded-tl-sm w-full relative overflow-hidden">
<!-- Top light highlight for glassmorphism -->
<div class="absolute top-0 left-0 right-0 h-[1px] bg-white/10"></div>
<div class="flex items-center mb-2">
<div class="w-6 h-6 rounded bg-primary-container/20 flex items-center justify-center mr-2">
<span class="material-symbols-outlined text-primary-container text-[14px]" data-icon="smart_toy">smart_toy</span>
</div>
<span class="text-label-caps font-label-caps text-primary-container">KOVA AI</span>
</div>
<div class="text-body-sm text-on-surface space-y-3">
<p>To improve performance during rapid typing, you should consider decoupling the syntax highlighting from the main React render cycle or debouncing the state updates.</p>
<p>Here is a suggested refactor using a ref for immediate feedback and debounced state for the highlighter:</p>
<div class="bg-surface border border-outline-variant/30 rounded p-2 font-code-md text-[11px] overflow-x-auto text-on-surface-variant">
<span class="code-keyword">const</span> editorRef = <span class="code-function">useRef</span>&lt;HTMLTextAreaElement&gt;(<span class="code-keyword">null</span>)<span class="code-punctuation">;</span>
<span class="code-keyword">const</span> [highlightedCode, setHighlightedCode] = <span class="code-function">useState</span>(initialCode)<span class="code-punctuation">;</span>
<span class="code-comment">// Use debounced update for highlighting</span>
<span class="code-keyword">const</span> handleInput = <span class="code-function">useDebounce</span>((value) =&gt; {
  <span class="code-function">setHighlightedCode</span>(value)<span class="code-punctuation">;</span>
}, <span class="code-string">150</span>)<span class="code-punctuation">;</span>
</div>
</div>
<div class="mt-3 flex space-x-2">
<button class="bg-primary-container/10 hover:bg-primary-container/20 text-primary-container border border-primary-container/30 px-2 py-1 rounded text-[11px] flex items-center transition-colors">
<span class="material-symbols-outlined text-[12px] mr-1" data-icon="add_circle">add_circle</span> Apply to File
                        </button>
</div>
</div>
</div>
<!-- Input Area -->
<div class="p-4 bg-surface-container-lowest/50 border-t border-outline-variant/30 relative">
<div class="relative bg-surface border border-outline-variant rounded-lg focus-within:border-primary-container focus-within:ring-1 focus-within:ring-primary-container/50 focus-within:glass-glow-active transition-all duration-200">
<textarea class="w-full bg-transparent text-body-sm text-on-surface p-3 pr-10 resize-none outline-none placeholder:text-outline-variant h-[80px]" placeholder="Ask Kova to refactor, explain, or generate code..."></textarea>
<button class="absolute bottom-2 right-2 p-1.5 bg-primary-container text-on-primary rounded hover:opacity-90 transition-colors shadow-[0_0_10px_rgba(0,209,255,0.3)]">
<span class="material-symbols-outlined text-[16px]" data-icon="send">send</span>
</button>
</div>
<div class="flex items-center justify-between mt-2 text-[10px] text-outline-variant">
<div class="flex items-center space-x-2">
<span class="hover:text-on-surface cursor-pointer flex items-center"><span class="material-symbols-outlined text-[12px] mr-1" data-icon="attach_file">attach_file</span> Attach context</span>
</div>
<span>Press Enter to send</span>
</div>
</div>
</aside>
</main>
<!-- Footer -->
<footer class="w-full h-6 fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 bg-surface-container border-t border-outline-variant text-secondary font-label-caps text-label-caps">
<div class="flex flex-row items-center space-x-4">
<span class="hidden">Kova</span> <!-- Brand logo hidden per style -->
<div class="flex items-center space-x-4">
<span class="text-on-surface-variant hover:bg-surface-bright cursor-default px-2 py-0.5 rounded transition-colors flex items-center">
<span class="material-symbols-outlined text-[12px] mr-1" data-icon="call_split">call_split</span>
                    main
                </span>
<span class="text-on-surface-variant hover:bg-surface-bright cursor-default px-2 py-0.5 rounded transition-colors flex items-center">
<span class="material-symbols-outlined text-[12px] mr-1" data-icon="sync">sync</span>
</span>
<span class="text-on-surface-variant hover:bg-surface-bright cursor-default px-2 py-0.5 rounded transition-colors flex items-center text-error">
<span class="material-symbols-outlined text-[12px] mr-1" data-icon="error">error</span>
                    0
                </span>
<span class="text-on-surface-variant hover:bg-surface-bright cursor-default px-2 py-0.5 rounded transition-colors flex items-center text-tertiary">
<span class="material-symbols-outlined text-[12px] mr-1" data-icon="warning">warning</span>
                    0
                </span>
</div>
</div>
<div class="flex flex-row items-center space-x-4">
<span class="text-on-surface-variant hover:bg-surface-bright cursor-default px-2 py-0.5 rounded transition-colors">UTF-8</span>
<span class="text-on-surface-variant hover:bg-surface-bright cursor-default px-2 py-0.5 rounded transition-colors">Spaces: 2</span>
<span class="text-on-surface-variant hover:bg-surface-bright cursor-default px-2 py-0.5 rounded transition-colors flex items-center">
<span class="material-symbols-outlined text-[12px] mr-1" data-icon="check_circle">check_circle</span>
                Prettier
            </span>
<span class="text-outline-variant ml-4">Kova AI v1.0.4</span>
</div>
</footer>
</body></html>

<!-- Kova - Dashboard de Projetos -->
<!DOCTYPE html>

<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Kova - Project Dashboard</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&amp;family=JetBrains+Mono:ital,wght@0,400;1,400&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        "colors": {
                "surface-bright": "#333a3d",
                "outline": "#859399",
                "surface": "#0e1417",
                "on-error-container": "#ffdad6",
                "primary": "#a4e6ff",
                "surface-container-highest": "#2f3639",
                "on-surface-variant": "#bbc9cf",
                "surface-tint": "#4cd6ff",
                "on-tertiary-fixed-variant": "#624000",
                "inverse-primary": "#00677f",
                "error": "#ffb4ab",
                "tertiary-fixed-dim": "#ffba49",
                "surface-container-lowest": "#090f12",
                "secondary": "#b9c8de",
                "on-secondary-container": "#a7b6cc",
                "on-secondary": "#233143",
                "on-primary-fixed-variant": "#004e60",
                "tertiary-container": "#feb127",
                "secondary-fixed-dim": "#b9c8de",
                "on-secondary-fixed": "#0d1c2d",
                "inverse-surface": "#dde3e7",
                "on-primary-container": "#00566a",
                "surface-container-low": "#161d1f",
                "surface-dim": "#0e1417",
                "on-secondary-fixed-variant": "#39485a",
                "secondary-container": "#39485a",
                "on-tertiary": "#442b00",
                "surface-variant": "#2f3639",
                "tertiary": "#ffd59c",
                "on-tertiary-container": "#6b4700",
                "on-surface": "#dde3e7",
                "surface-container": "#1a2123",
                "secondary-fixed": "#d4e4fa",
                "on-tertiary-fixed": "#291800",
                "background": "#0e1417",
                "on-error": "#690005",
                "on-primary-fixed": "#001f28",
                "on-background": "#dde3e7",
                "surface-container-high": "#242b2e",
                "tertiary-fixed": "#ffddb1",
                "primary-container": "#00d1ff",
                "inverse-on-surface": "#2b3134",
                "primary-fixed": "#b7eaff",
                "on-primary": "#003543",
                "error-container": "#93000a",
                "primary-fixed-dim": "#4cd6ff",
                "outline-variant": "#3c494e"
        },
        "borderRadius": {
                "DEFAULT": "0.125rem",
                "lg": "0.25rem",
                "xl": "0.5rem",
                "full": "0.75rem"
        },
        "spacing": {
                "unit": "4px",
                "lg": "24px",
                "sm": "8px",
                "gutter": "12px",
                "md": "16px",
                "xl": "48px",
                "xs": "4px",
                "sidebar-width": "260px"
        },
        "fontFamily": {
                "body-base": [
                        "Geist"
                ],
                "display-lg": [
                        "Geist"
                ],
                "code-sm": [
                        "JetBrains Mono"
                ],
                "label-xs": [
                        "Geist"
                ],
                "headline-md": [
                        "Geist"
                ]
        },
        "fontSize": {
                "body-base": [
                        "15px",
                        {
                                "lineHeight": "1.6",
                                "fontWeight": "400"
                        }
                ],
                "display-lg": [
                        "48px",
                        {
                                "lineHeight": "1.1",
                                "letterSpacing": "-0.02em",
                                "fontWeight": "700"
                        }
                ],
                "code-sm": [
                        "13px",
                        {
                                "lineHeight": "1.5",
                                "fontWeight": "400"
                        }
                ],
                "label-xs": [
                        "11px",
                        {
                                "lineHeight": "1",
                                "letterSpacing": "0.05em",
                                "fontWeight": "600"
                        }
                ],
                "headline-md": [
                        "24px",
                        {
                                "lineHeight": "1.3",
                                "fontWeight": "600"
                        }
                ]
        }
},
    },
  }
</script>
<style>
        .glass-panel {
            background-color: rgba(22, 29, 31, 0.8);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(164, 230, 255, 0.1);
            border-top: 1px solid rgba(164, 230, 255, 0.2);
        }
        .ai-glow {
            box-shadow: 0 0 15px rgba(0, 209, 255, 0.15);
        }
        .input-focus:focus-within {
            border-color: #00d1ff;
            box-shadow: 0 0 4px rgba(0, 209, 255, 0.5);
        }
    </style>
</head>
<body class="bg-background text-on-surface h-screen overflow-hidden flex font-body-base selection:bg-primary-container/30 selection:text-primary">
<!-- SideNavBar -->
<nav class="bg-surface-container-low dark:bg-surface-container-low text-primary font-body-base text-body-base h-full w-sidebar-width flex flex-col border-r border-outline-variant fixed left-0 top-0 bottom-0 z-40">
<div class="p-6 flex items-center gap-3">
<div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
<span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">terminal</span>
</div>
<div>
<div class="font-headline-md text-headline-md font-bold text-primary leading-tight">Kova</div>
<div class="text-on-surface-variant font-label-xs text-label-xs">AI IDE</div>
</div>
</div>
<div class="flex-1 flex flex-col px-3 py-2 space-y-1">
<div class="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95 flex items-center gap-3 px-3 py-2 rounded">
<span class="material-symbols-outlined">folder_open</span>
<span>Explorer</span>
</div>
<div class="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95 flex items-center gap-3 px-3 py-2 rounded">
<span class="material-symbols-outlined">search</span>
<span>Search</span>
</div>
<div class="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95 flex items-center gap-3 px-3 py-2 rounded">
<span class="material-symbols-outlined">account_tree</span>
<span>Source Control</span>
</div>
<div class="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95 flex items-center gap-3 px-3 py-2 rounded">
<span class="material-symbols-outlined">extension</span>
<span>Extensions</span>
</div>
<div class="text-primary border-l-2 border-primary bg-surface-container-high hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95 flex items-center gap-3 px-3 py-2 rounded-r">
<span class="material-symbols-outlined">smart_toy</span>
<span>AI</span>
</div>
</div>
<div class="px-3 pb-6 flex flex-col space-y-1">
<div class="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95 flex items-center gap-3 px-3 py-2 rounded">
<span class="material-symbols-outlined">settings</span>
<span>Settings</span>
</div>
<div class="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-100 cursor-pointer active:scale-95 flex items-center gap-3 px-3 py-2 rounded">
<span class="material-symbols-outlined">person</span>
<span>Account</span>
</div>
</div>
</nav>
<!-- TopAppBar -->
<header class="bg-surface-container-lowest/80 backdrop-blur-xl text-primary font-body-base text-body-base w-full h-12 flex items-center border-b border-outline-variant fixed top-0 right-0 left-sidebar-width z-30 px-lg justify-between">
<div class="flex items-center space-x-6">
<div class="text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100">File</div>
<div class="text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100">Edit</div>
<div class="text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100">Selection</div>
<div class="text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100">View</div>
<div class="text-on-surface font-semibold hover:text-primary transition-colors cursor-pointer ease-in duration-100">Go</div>
</div>
<div class="flex-1 max-w-md mx-6">
<div class="relative flex items-center bg-surface-container-low border border-outline-variant rounded px-3 py-1 input-focus transition-all duration-200">
<span class="material-symbols-outlined text-on-surface-variant text-sm mr-2">search</span>
<input class="bg-transparent border-none outline-none text-on-surface w-full font-body-base text-body-base placeholder:text-on-surface-variant/50 focus:ring-0 p-0" placeholder="Search files or commands..." type="text"/>
<div class="flex items-center gap-1 ml-2">
<span class="bg-surface-container px-1.5 py-0.5 rounded text-label-xs text-on-surface-variant font-code-sm border border-outline-variant/30">⌘</span>
<span class="bg-surface-container px-1.5 py-0.5 rounded text-label-xs text-on-surface-variant font-code-sm border border-outline-variant/30">K</span>
</div>
</div>
</div>
<div class="flex items-center space-x-4">
<span class="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100">splitscreen</span>
<span class="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100">dock</span>
<span class="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer ease-in duration-100">more_vert</span>
</div>
</header>
<!-- Main Content Canvas -->
<main class="ml-[260px] mt-12 w-full h-[calc(100vh-48px-24px)] overflow-y-auto p-lg">
<!-- Dashboard Header -->
<div class="flex items-end justify-between mb-8">
<div>
<h1 class="font-display-lg text-display-lg text-on-surface mb-2">Projects</h1>
<p class="text-on-surface-variant font-body-base text-body-base">Manage your active workspaces and monitor AI productivity.</p>
</div>
<button class="bg-primary-container hover:bg-primary text-on-primary px-4 py-2 rounded font-body-base text-body-base flex items-center gap-2 transition-colors duration-100">
<span class="material-symbols-outlined text-sm">add</span>
                New Project
            </button>
</div>
<!-- Bento Grid Layout -->
<div class="grid grid-cols-12 gap-gutter mb-8">
<!-- Metrics Card (Spans 8 cols) -->
<div class="col-span-12 lg:col-span-8 glass-panel rounded p-6 flex flex-col justify-between ai-glow">
<div class="flex items-center justify-between mb-6">
<h2 class="font-headline-md text-headline-md text-on-surface">AI Contribution</h2>
<span class="bg-primary-container/20 text-primary-container px-2 py-1 rounded text-label-xs font-label-xs tracking-wider border border-primary-container/30">THIS WEEK</span>
</div>
<div class="flex items-end gap-8 mb-6">
<div>
<div class="text-4xl font-bold text-on-surface mb-1">14,208</div>
<div class="text-on-surface-variant font-body-base text-body-base flex items-center gap-1">
<span class="w-2 h-2 rounded-full bg-primary inline-block"></span>
                            Lines written by AI
                        </div>
</div>
<div>
<div class="text-2xl font-bold text-on-surface-variant mb-1">3,402</div>
<div class="text-on-surface-variant font-body-base text-body-base flex items-center gap-1">
<span class="w-2 h-2 rounded-full bg-secondary inline-block"></span>
                            Lines written manually
                        </div>
</div>
</div>
<!-- Fake progress bar chart -->
<div class="w-full h-2 bg-surface-container rounded-full overflow-hidden flex">
<div class="h-full bg-primary" style="width: 80%;"></div>
<div class="h-full bg-secondary" style="width: 20%;"></div>
</div>
</div>
<!-- Active Tasks (Spans 4 cols) -->
<div class="col-span-12 lg:col-span-4 glass-panel rounded p-6 flex flex-col">
<div class="flex items-center justify-between mb-4">
<h2 class="font-body-base text-body-base font-semibold text-on-surface">Active Contexts</h2>
<span class="material-symbols-outlined text-on-surface-variant text-sm cursor-pointer hover:text-primary">more_horiz</span>
</div>
<div class="space-y-3 flex-1">
<div class="p-3 bg-surface-container-low rounded border border-outline-variant/30 flex items-start gap-3 hover:border-primary/30 transition-colors cursor-pointer">
<span class="material-symbols-outlined text-secondary text-sm mt-0.5">change_history</span>
<div>
<div class="font-body-base text-body-base text-on-surface font-medium">Refactor Authentication Flow</div>
<div class="font-code-sm text-code-sm text-outline italic mt-1">// AI suggesting JWT implementation</div>
</div>
</div>
<div class="p-3 bg-surface-container-low rounded border border-outline-variant/30 flex items-start gap-3 hover:border-primary/30 transition-colors cursor-pointer">
<span class="material-symbols-outlined text-primary text-sm mt-0.5">data_object</span>
<div>
<div class="font-body-base text-body-base text-on-surface font-medium">Optimize Database Queries</div>
<div class="font-code-sm text-code-sm text-outline italic mt-1">// Indexing suggestions pending</div>
</div>
</div>
</div>
</div>
</div>
<!-- Recent Projects Grid -->
<h2 class="font-headline-md text-headline-md text-on-surface mb-4">Recent Workspaces</h2>
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter pb-8">
<!-- Project Card 1 -->
<div class="glass-panel rounded overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors duration-200 flex flex-col h-full">
<div class="h-32 bg-surface-container-lowest relative overflow-hidden border-b border-outline-variant/30">
<div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
<div class="absolute bottom-4 left-4 font-code-sm text-code-sm text-on-surface-variant/50 group-hover:text-primary/70 transition-colors">
                        src/components/ui/glass.tsx
                    </div>
</div>
<div class="p-4 flex flex-col flex-1 justify-between bg-surface-dim">
<div>
<h3 class="font-body-base text-body-base font-semibold text-on-surface mb-1">Nexus UI Library</h3>
<p class="font-body-base text-body-base text-on-surface-variant line-clamp-2 mb-3">React component library utilizing Tailwind and framer-motion.</p>
</div>
<div class="flex items-center justify-between mt-auto pt-3 border-t border-outline-variant/20">
<div class="flex items-center gap-2">
<span class="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-label-xs font-code-sm">TypeScript</span>
<span class="bg-secondary/10 text-secondary px-1.5 py-0.5 rounded text-label-xs font-code-sm">React</span>
</div>
<span class="text-on-surface-variant font-label-xs text-label-xs">2h ago</span>
</div>
</div>
</div>
<!-- Project Card 2 -->
<div class="glass-panel rounded overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors duration-200 flex flex-col h-full">
<div class="h-32 bg-surface-container-lowest relative overflow-hidden border-b border-outline-variant/30">
<div class="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent"></div>
<div class="absolute bottom-4 left-4 font-code-sm text-code-sm text-on-surface-variant/50 group-hover:text-secondary/70 transition-colors">
                        api/v1/auth/routes.py
                    </div>
</div>
<div class="p-4 flex flex-col flex-1 justify-between bg-surface-dim">
<div>
<h3 class="font-body-base text-body-base font-semibold text-on-surface mb-1">Quantum Backend</h3>
<p class="font-body-base text-body-base text-on-surface-variant line-clamp-2 mb-3">High-performance microservices architecture for data processing.</p>
</div>
<div class="flex items-center justify-between mt-auto pt-3 border-t border-outline-variant/20">
<div class="flex items-center gap-2">
<span class="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-label-xs font-code-sm">Python</span>
<span class="bg-tertiary-container/20 text-tertiary-container px-1.5 py-0.5 rounded text-label-xs font-code-sm">FastAPI</span>
</div>
<span class="text-on-surface-variant font-label-xs text-label-xs">1d ago</span>
</div>
</div>
</div>
<!-- Project Card 3 -->
<div class="glass-panel rounded overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors duration-200 flex flex-col h-full">
<div class="h-32 bg-surface-container-lowest relative overflow-hidden border-b border-outline-variant/30">
<div class="absolute inset-0 bg-gradient-to-br from-tertiary-container/10 to-transparent"></div>
<div class="absolute bottom-4 left-4 font-code-sm text-code-sm text-on-surface-variant/50 group-hover:text-tertiary-container/70 transition-colors">
                        crates/engine/src/main.rs
                    </div>
</div>
<div class="p-4 flex flex-col flex-1 justify-between bg-surface-dim">
<div>
<h3 class="font-body-base text-body-base font-semibold text-on-surface mb-1">Aether Engine</h3>
<p class="font-body-base text-body-base text-on-surface-variant line-clamp-2 mb-3">Experimental low-latency physics engine for web assembly.</p>
</div>
<div class="flex items-center justify-between mt-auto pt-3 border-t border-outline-variant/20">
<div class="flex items-center gap-2">
<span class="bg-tertiary-container/20 text-tertiary-container px-1.5 py-0.5 rounded text-label-xs font-code-sm">Rust</span>
<span class="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-label-xs font-code-sm">WASM</span>
</div>
<span class="text-on-surface-variant font-label-xs text-label-xs">3d ago</span>
</div>
</div>
</div>
</div>
</main>
<!-- Footer -->
<footer class="bg-surface-container dark:bg-surface-container text-secondary font-label-xs text-label-xs w-full h-6 fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 border-t border-outline-variant">
<div class="flex flex-row items-center space-x-4">
<span class="text-on-surface-variant hover:bg-surface-bright cursor-default px-1 py-0.5 rounded">main</span>
<span class="text-on-surface-variant hover:bg-surface-bright cursor-default px-1 py-0.5 rounded">UTF-8</span>
<span class="text-on-surface-variant hover:bg-surface-bright cursor-default px-1 py-0.5 rounded">Spaces: 2</span>
<span class="text-on-surface hover:bg-surface-bright cursor-default px-1 py-0.5 rounded text-primary">Prettier</span>
</div>
<div class="text-on-surface-variant">Kova AI v1.0.4</div>
</footer>
</body></html>
