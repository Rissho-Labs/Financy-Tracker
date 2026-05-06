# DESIGN SYSTEM — AURA STYLE
> **Versão:** 1.0.0 | **Última atualização:** 2026 | **Licença:** MIT

---

## Índice

1. [Visão Geral & Princípios](#1-visão-geral--princípios)
2. [Tokens Semânticos — Cores](#2-tokens-semânticos--cores)
3. [Tokens Semânticos — Tipografia](#3-tokens-semânticos--tipografia)
4. [Tokens Semânticos — Espaçamento](#4-tokens-semânticos--espaçamento)
5. [Tokens Semânticos — Raios de Borda](#5-tokens-semânticos--raios-de-borda)
6. [Tokens Semânticos — Sombras & Elevação](#6-tokens-semânticos--sombras--elevação)
7. [Tokens Semânticos — Efeitos Visuais (Glassmorphism)](#7-tokens-semânticos--efeitos-visuais-glassmorphism)
8. [Tokens Semânticos — Motion & Animação](#8-tokens-semânticos--motion--animação)
9. [Tokens Semânticos — Breakpoints & Grid](#9-tokens-semânticos--breakpoints--grid)
10. [Tokens Semânticos — Z-Index](#10-tokens-semânticos--z-index)
11. [Tokens Semânticos — Opacidade & Blur](#11-tokens-semânticos--opacidade--blur)
12. [Componentes Base](#12-componentes-base)
13. [Padrões de Layout (Bento Grid)](#13-padrões-de-layout-bento-grid)
14. [Temas: Light / Dark / System](#14-temas-light--dark--system)
15. [Variáveis CSS — Implementação](#15-variáveis-css--implementação)
16. [Tailwind Config — Extensão](#16-tailwind-config--extensão)
17. [Regras Negativas (Anti-Patterns)](#17-regras-negativas-anti-patterns)
18. [Compatibilidade Cross-Platform](#18-compatibilidade-cross-platform)
19. [Checklist de Qualidade](#19-checklist-de-qualidade)

---

## 1. Visão Geral & Princípios

O **Aura Design System** é um sistema de design multiplataforma de alta fidelidade inspirado na filosofia visual da Apple (clareza, profundidade, deleite), adaptado para ambientes web, mobile (Android/iOS), e qualquer tecnologia de frontend (React, Vue, Svelte, Flutter, etc.).

### Filosofia em 5 Pilares

| Pilar | Descrição | Token Referência |
|-------|-----------|-----------------|
| **Profundidade** | Camadas translúcidas criam hierarquia visual sem ruído | `--glass-*` |
| **Precisão** | Espaçamento e tipografia seguem escala matemática (4pt grid) | `--space-*` |
| **Fluidez** | Animações com física real (spring), nunca lineares | `--motion-*` |
| **Semântica** | Tokens nomeados por intenção, não por valor | `--color-surface-*` |
| **Adaptabilidade** | Tokens respondem ao tema do SO automaticamente | `prefers-color-scheme` |

### Princípios de Design

- **Zero Latency UI:** Feedback visual instantâneo. Nunca bloquear a UI com spinner para ações pequenas.
- **Glassmorphism Responsável:** Transparência com legibilidade garantida (contraste WCAG AA mínimo).
- **Bento Grid First:** Layouts modulares, assimétricos e com hierarquia visual clara.
- **Motion com Propósito:** Animações guiam atenção, não apenas decoram.
- **Dark by Default:** Suporte nativo a dark mode desde o primeiro token.

---

## 2. Tokens Semânticos — Cores

### Escala Primitiva (Base)

> Estes são os valores brutos. **Nunca usar diretamente** no código de produto — use sempre os tokens semânticos abaixo.

```
Neutral
├── neutral-0:    #FFFFFF
├── neutral-50:   #F9FAFB
├── neutral-100:  #F3F4F6
├── neutral-200:  #E5E7EB
├── neutral-300:  #D1D5DB
├── neutral-400:  #9CA3AF
├── neutral-500:  #6B7280
├── neutral-600:  #4B5563
├── neutral-700:  #374151
├── neutral-800:  #1F2937
├── neutral-900:  #111827
└── neutral-950:  #030712

Violet (Accent Primário)
├── violet-100:   #EDE9FE
├── violet-200:   #DDD6FE
├── violet-300:   #C4B5FD
├── violet-400:   #A78BFA
├── violet-500:   #8B5CF6
├── violet-600:   #7C3AED
├── violet-700:   #6D28D9
└── violet-800:   #5B21B6

Indigo (Accent Secundário)
├── indigo-400:   #818CF8
├── indigo-500:   #6366F1
└── indigo-600:   #4F46E5

Lime (Accent Sucesso / CTA)
├── lime-300:     #BEF264
├── lime-400:     #A3E635
└── lime-500:     #84CC16

Amber (Warning)
├── amber-300:    #FCD34D
├── amber-400:    #FBBF24
└── amber-500:    #F59E0B

Rose (Destructive)
├── rose-300:     #FDA4AF
├── rose-400:     #FB7185
└── rose-500:     #F43F5E
```

---

### Tokens Semânticos de Cor — Superfície

| Token | Light Mode | Dark Mode | Uso |
|-------|-----------|-----------|-----|
| `--color-background` | `neutral-50` `#F9FAFB` | `neutral-950` `#030712` | Fundo da página/app |
| `--color-surface-1` | `neutral-0` `#FFFFFF` | `neutral-900` `#111827` | Cards, modais |
| `--color-surface-2` | `neutral-100` `#F3F4F6` | `neutral-800` `#1F2937` | Seções aninhadas |
| `--color-surface-3` | `neutral-200` `#E5E7EB` | `neutral-700` `#374151` | Inputs, tags |
| `--color-surface-glass` | `rgba(255,255,255,0.60)` | `rgba(3,7,18,0.60)` | Glassmorphism |
| `--color-surface-overlay` | `rgba(255,255,255,0.85)` | `rgba(17,24,39,0.85)` | Tooltips, popover |

---

### Tokens Semânticos de Cor — Conteúdo

| Token | Light Mode | Dark Mode | Uso |
|-------|-----------|-----------|-----|
| `--color-text-primary` | `neutral-900` `#111827` | `neutral-50` `#F9FAFB` | Títulos, body principal |
| `--color-text-secondary` | `neutral-600` `#4B5563` | `neutral-400` `#9CA3AF` | Subtítulos, descrições |
| `--color-text-tertiary` | `neutral-400` `#9CA3AF` | `neutral-600` `#4B5563` | Placeholders, meta |
| `--color-text-disabled` | `neutral-300` `#D1D5DB` | `neutral-700` `#374151` | Estados desabilitados |
| `--color-text-inverse` | `neutral-0` `#FFFFFF` | `neutral-950` `#030712` | Texto sobre fundo escuro |
| `--color-text-gradient-start` | `neutral-900` `#111827` | `neutral-100` `#F3F4F6` | Gradiente de heading |
| `--color-text-gradient-end` | `neutral-600` `#4B5563` | `neutral-500` `#6B7280` | Gradiente de heading |

---

### Tokens Semânticos de Cor — Borda

| Token | Light Mode | Dark Mode | Uso |
|-------|-----------|-----------|-----|
| `--color-border-subtle` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` | Divisores suaves |
| `--color-border-default` | `neutral-200` `#E5E7EB` | `neutral-700` `#374151` | Bordas de cards |
| `--color-border-strong` | `neutral-300` `#D1D5DB` | `neutral-600` `#4B5563` | Bordas de inputs |
| `--color-border-glass` | `rgba(255,255,255,0.20)` | `rgba(255,255,255,0.10)` | Bordas glassmorphism |
| `--color-border-focus` | `violet-500` `#8B5CF6` | `violet-400` `#A78BFA` | Focus ring |

---

### Tokens Semânticos de Cor — Interação (Brand & Accent)

| Token | Light Mode | Dark Mode | Uso |
|-------|-----------|-----------|-----|
| `--color-primary` | `violet-600` `#7C3AED` | `violet-500` `#8B5CF6` | CTA principal |
| `--color-primary-hover` | `violet-700` `#6D28D9` | `violet-400` `#A78BFA` | Hover de CTA |
| `--color-primary-foreground` | `neutral-0` `#FFFFFF` | `neutral-0` `#FFFFFF` | Texto sobre primary |
| `--color-secondary` | `indigo-500` `#6366F1` | `indigo-400` `#818CF8` | Ação secundária |
| `--color-accent-cta` | `lime-400` `#A3E635` | `lime-300` `#BEF264` | CTA de destaque máximo |
| `--color-accent-cta-foreground` | `neutral-900` `#111827` | `neutral-900` `#111827` | Texto sobre accent CTA |

---

### Tokens Semânticos de Cor — Feedback

| Token | Light Mode | Dark Mode | Uso |
|-------|-----------|-----------|-----|
| `--color-success` | `lime-500` `#84CC16` | `lime-400` `#A3E635` | Sucesso |
| `--color-success-surface` | `rgba(132,204,22,0.10)` | `rgba(163,230,53,0.12)` | Background de sucesso |
| `--color-warning` | `amber-500` `#F59E0B` | `amber-400` `#FBBF24` | Aviso |
| `--color-warning-surface` | `rgba(245,158,11,0.10)` | `rgba(251,191,36,0.12)` | Background de aviso |
| `--color-destructive` | `rose-500` `#F43F5E` | `rose-400` `#FB7185` | Erro, delete |
| `--color-destructive-surface` | `rgba(244,63,94,0.10)` | `rgba(251,113,133,0.12)` | Background de erro |
| `--color-info` | `indigo-500` `#6366F1` | `indigo-400` `#818CF8` | Informação |
| `--color-info-surface` | `rgba(99,102,241,0.10)` | `rgba(129,140,248,0.12)` | Background de info |

---

## 3. Tokens Semânticos — Tipografia

### Família de Fontes

```
--font-sans:    "Geist Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif
--font-mono:    "Geist Mono", "JetBrains Mono", "Fira Code", monospace
--font-display: "Geist Sans", system-ui, sans-serif
```

> **Nota Cross-Platform:** Em Android, usar `Roboto` como fallback. Em iOS/macOS, `-apple-system` é resolvido para `SF Pro`. Em Flutter, usar `GoogleFonts.inter()`.

---

### Escala Tipográfica (Type Scale)

| Token | Valor | Line Height | Letter Spacing | Peso | Uso |
|-------|-------|-------------|----------------|------|-----|
| `--text-xs` | `12px / 0.75rem` | `1.5` (18px) | `+0.025em` | 400 | Labels, badges, captions |
| `--text-sm` | `14px / 0.875rem` | `1.5` (21px) | `+0.010em` | 400 | Body small, meta info |
| `--text-base` | `16px / 1rem` | `1.625` (26px) | `0` | 400 | Body principal |
| `--text-lg` | `18px / 1.125rem` | `1.556` (28px) | `-0.010em` | 400–500 | Lead text, subtítulos |
| `--text-xl` | `20px / 1.25rem` | `1.4` (28px) | `-0.015em` | 500–600 | Card title, section header |
| `--text-2xl` | `24px / 1.5rem` | `1.333` (32px) | `-0.020em` | 600 | Page section title |
| `--text-3xl` | `30px / 1.875rem` | `1.267` (38px) | `-0.025em` | 700 | Heading H2 |
| `--text-4xl` | `36px / 2.25rem` | `1.222` (44px) | `-0.030em` | 700–800 | Heading H1 |
| `--text-5xl` | `48px / 3rem` | `1.083` (52px) | `-0.040em` | 800 | Display / Hero |
| `--text-6xl` | `60px / 3.75rem` | `1` (60px) | `-0.045em` | 800–900 | Super display |
| `--text-7xl` | `72px / 4.5rem` | `1` (72px) | `-0.050em` | 900 | Landmark / Splash |

---

### Pesos de Fonte

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-normal` | `400` | Body text |
| `--font-medium` | `500` | Labels, navegação |
| `--font-semibold` | `600` | Botões, card titles |
| `--font-bold` | `700` | Headings H2, H3 |
| `--font-extrabold` | `800` | Headings H1 |
| `--font-black` | `900` | Display, hero |

---

### Gradient de Texto (Aura Heading Style)

```css
/* Padrão Claro */
.text-gradient-light {
  background: linear-gradient(
    180deg,
    var(--color-text-gradient-start) 0%,
    var(--color-text-gradient-end) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Padrão Escuro */
.text-gradient-dark {
  background: linear-gradient(
    180deg,
    #F9FAFB 0%,
    rgba(249,250,251,0.60) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Accent Gradient (Violet → Indigo) */
.text-gradient-accent {
  background: linear-gradient(
    135deg,
    #A78BFA 0%,    /* violet-400 */
    #818CF8 50%,   /* indigo-400 */
    #6366F1 100%   /* indigo-500 */
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## 4. Tokens Semânticos — Espaçamento

> **Base:** Grid de 4pt. Todo espaçamento é múltiplo de 4px.

| Token | Valor (px) | Valor (rem) | Uso típico |
|-------|-----------|-------------|-----------|
| `--space-0` | `0px` | `0` | Reset |
| `--space-px` | `1px` | `0.0625rem` | Divisores finos |
| `--space-0.5` | `2px` | `0.125rem` | Micro ajustes |
| `--space-1` | `4px` | `0.25rem` | Ícone a label, badge |
| `--space-1.5` | `6px` | `0.375rem` | Inline tight |
| `--space-2` | `8px` | `0.5rem` | Padding de chip, tag |
| `--space-2.5` | `10px` | `0.625rem` | Padding small |
| `--space-3` | `12px` | `0.75rem` | Gap entre elementos inline |
| `--space-4` | `16px` | `1rem` | Padding de card compact |
| `--space-5` | `20px` | `1.25rem` | Padding padrão |
| `--space-6` | `24px` | `1.5rem` | Gap entre cards |
| `--space-8` | `32px` | `2rem` | Padding de card default |
| `--space-10` | `40px` | `2.5rem` | Section padding small |
| `--space-12` | `48px` | `3rem` | Gap de grid |
| `--space-16` | `64px` | `4rem` | Section padding |
| `--space-20` | `80px` | `5rem` | Section padding large |
| `--space-24` | `96px` | `6rem` | Hero padding |
| `--space-32` | `128px` | `8rem` | Page section separation |

---

### Tokens de Espaçamento Semântico (Aliases)

| Token Semântico | Valor Base | Uso |
|----------------|-----------|-----|
| `--spacing-component-xs` | `--space-2` (8px) | Padding interno mínimo |
| `--spacing-component-sm` | `--space-4` (16px) | Padding de chips, badges |
| `--spacing-component-md` | `--space-5` (20px) | Padding de botões |
| `--spacing-component-lg` | `--space-8` (32px) | Padding de cards |
| `--spacing-component-xl` | `--space-12` (48px) | Padding de modais |
| `--spacing-layout-gap-sm` | `--space-4` (16px) | Gap de grid compacto |
| `--spacing-layout-gap-md` | `--space-6` (24px) | Gap de grid padrão |
| `--spacing-layout-gap-lg` | `--space-8` (32px) | Gap de grid generous |
| `--spacing-section-sm` | `--space-16` (64px) | Separação de seções pequenas |
| `--spacing-section-md` | `--space-24` (96px) | Separação de seções padrão |
| `--spacing-section-lg` | `--space-32` (128px) | Separação de seções grandes |

---

## 5. Tokens Semânticos — Raios de Borda

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-none` | `0px` | Sem arredondamento |
| `--radius-sm` | `4px` | Badges, chips small |
| `--radius-md` | `8px` | Inputs, botões small |
| `--radius-lg` | `12px` | Cards compactos |
| `--radius-xl` | `16px` | Cards padrão |
| `--radius-2xl` | `20px` | Modais, drawers |
| `--radius-3xl` | `24px` | Cards grandes, hero |
| `--radius-4xl` | `32px` | Bento cards XL |
| `--radius-full` | `9999px` | Pills, avatares, badges |

### Aliases Semânticos

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-button` | `--radius-md` (8px) | Botões padrão |
| `--radius-button-pill` | `--radius-full` | Botões pill |
| `--radius-input` | `--radius-md` (8px) | Campos de formulário |
| `--radius-card` | `--radius-xl` (16px) | Cards |
| `--radius-card-lg` | `--radius-3xl` (24px) | Cards grandes |
| `--radius-modal` | `--radius-2xl` (20px) | Modais e drawers |
| `--radius-tooltip` | `--radius-lg` (12px) | Tooltips |
| `--radius-avatar-sm` | `--radius-full` | Avatar pequeno |
| `--radius-avatar-lg` | `--radius-xl` (16px) | Avatar quadrado |

---

## 6. Tokens Semânticos — Sombras & Elevação

> **Regra:** Nenhuma sombra usa `black` puro. Sempre com opacidade e/ou coloração.

### Escala de Sombra

| Token | Valor CSS | Uso |
|-------|-----------|-----|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Separação sutil |
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.08)` | Cards flat |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.10)` | Cards elevados |
| `--shadow-lg` | `0 8px 30px rgba(0,0,0,0.12)` | Modais, dropdowns |
| `--shadow-xl` | `0 16px 48px rgba(0,0,0,0.14)` | Popovers, sheets |
| `--shadow-2xl` | `0 24px 64px rgba(0,0,0,0.16)` | Drawers, sidebars |

### Sombras Coloridas (Accent Glow)

| Token | Valor CSS | Uso |
|-------|-----------|-----|
| `--shadow-glow-primary` | `0 8px 32px rgba(124,58,237,0.30)` | Botão CTA hover |
| `--shadow-glow-violet` | `0 4px 20px rgba(167,139,250,0.25)` | Elementos accent |
| `--shadow-glow-indigo` | `0 4px 20px rgba(99,102,241,0.20)` | Elementos secundários |
| `--shadow-glow-lime` | `0 4px 20px rgba(163,230,53,0.25)` | Accent CTA glow |
| `--shadow-glow-rose` | `0 4px 16px rgba(244,63,94,0.20)` | Destructive glow |

### Sombra de Glass (Glassmorphism)

```css
--shadow-glass: 
  0 8px 32px rgba(0, 0, 0, 0.12),
  inset 0 1px 0 rgba(255, 255, 255, 0.20);
```

### Sistema de Elevação (Semântico)

| Nível | Token | Sombra | Z-Index |
|-------|-------|--------|---------|
| **0** | `--elevation-flat` | Nenhuma | `0` |
| **1** | `--elevation-raised` | `--shadow-sm` | `1` |
| **2** | `--elevation-overlay` | `--shadow-md` | `10` |
| **3** | `--elevation-floating` | `--shadow-lg` | `50` |
| **4** | `--elevation-modal` | `--shadow-xl` | `100` |
| **5** | `--elevation-toast` | `--shadow-2xl` | `200` |

---

## 7. Tokens Semânticos — Efeitos Visuais (Glassmorphism)

### Blur

| Token | Valor | Uso |
|-------|-------|-----|
| `--blur-xs` | `blur(4px)` | Blur muito sutil |
| `--blur-sm` | `blur(8px)` | Glass leve |
| `--blur-md` | `blur(16px)` | Glass padrão |
| `--blur-lg` | `blur(24px)` | Glass intenso |
| `--blur-xl` | `blur(40px)` | Fundo de modal |
| `--blur-2xl` | `blur(64px)` | Halo de fundo |

### Receitas de Glass

```css
/* Glass Card — Light */
.glass-card-light {
  background: rgba(255, 255, 255, 0.60);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.20);
  box-shadow: var(--shadow-glass);
}

/* Glass Card — Dark */
.glass-card-dark {
  background: rgba(17, 24, 39, 0.60);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: var(--shadow-glass);
}

/* Glass Nav — Sticky */
.glass-nav {
  background: rgba(249, 250, 251, 0.80);
  backdrop-filter: blur(16px) saturate(200%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

/* Glass Modal */
.glass-modal {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(40px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.30);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.16);
}
```

### Gradientes de Fundo (Mesh Gradients)

```css
/* Mesh Gradient Light */
--gradient-mesh-light: 
  radial-gradient(ellipse 80% 60% at 20% 10%, rgba(167,139,250,0.15) 0%, transparent 60%),
  radial-gradient(ellipse 60% 50% at 80% 90%, rgba(99,102,241,0.12) 0%, transparent 60%),
  radial-gradient(ellipse 70% 40% at 50% 50%, rgba(163,230,53,0.06) 0%, transparent 70%);

/* Mesh Gradient Dark */
--gradient-mesh-dark:
  radial-gradient(ellipse 80% 60% at 20% 10%, rgba(124,58,237,0.20) 0%, transparent 60%),
  radial-gradient(ellipse 60% 50% at 80% 90%, rgba(79,70,229,0.16) 0%, transparent 60%),
  radial-gradient(ellipse 70% 40% at 50% 50%, rgba(132,204,22,0.08) 0%, transparent 70%),
  var(--color-background);

/* Grid Pattern Background */
--pattern-grid: 
  linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
  linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px);
--pattern-grid-size: 24px 24px;

/* Dot Pattern Background */
--pattern-dots: radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px);
--pattern-dots-size: 20px 20px;
```

---

## 8. Tokens Semânticos — Motion & Animação

### Duração

| Token | Valor | Uso |
|-------|-------|-----|
| `--duration-instant` | `0ms` | Sem animação |
| `--duration-fast` | `100ms` | Micro-interações |
| `--duration-normal` | `200ms` | Hover, focus states |
| `--duration-moderate` | `300ms` | Entrada de elementos |
| `--duration-slow` | `500ms` | Transições de página |
| `--duration-slower` | `700ms` | Animações complexas |
| `--duration-slowest` | `1000ms` | Animações de destaque |

---

### Curvas de Easing

| Token | Valor Cubic Bezier | Caráter |
|-------|-------------------|---------|
| `--ease-linear` | `cubic-bezier(0, 0, 1, 1)` | Mecânico, evitar |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Saída (elemento sai) |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Entrada (elemento entra) |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Transições de estado |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Spring com overshoot |
| `--ease-bounce` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Bounce suave |
| `--ease-snappy` | `cubic-bezier(0.23, 1, 0.32, 1)` | Rápido e preciso |

---

### Variantes de Entrada (Framer Motion)

```typescript
// Standard Entry — Fade Up
export const MOTION_FADE_UP = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: [0, 0, 0.2, 1] }
}

// Stagger Container
export const MOTION_STAGGER_CONTAINER = {
  animate: { transition: { staggerChildren: 0.08 } }
}

// Stagger Item
export const MOTION_STAGGER_ITEM = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
}

// Card Hover — Spring
export const MOTION_CARD_HOVER = {
  whileHover: { 
    scale: 1.02, 
    y: -4,
    transition: { type: "spring", stiffness: 400, damping: 25 }
  },
  whileTap: { scale: 0.98 }
}

// Button Spring
export const MOTION_BUTTON = {
  whileHover: { 
    scale: 1.03, 
    transition: { type: "spring", stiffness: 500, damping: 30 }
  },
  whileTap: { scale: 0.97 }
}

// Modal Entry
export const MOTION_MODAL = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
  transition: { duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }
}

// Slide In from Right (Drawer)
export const MOTION_DRAWER = {
  initial: { x: "100%" },
  animate: { x: 0 },
  exit: { x: "100%" },
  transition: { type: "spring", stiffness: 300, damping: 35 }
}
```

---

### Tokens de Transição CSS

```css
/* Tokens de Transição */
--transition-fast:     all var(--duration-fast) var(--ease-out);
--transition-normal:   all var(--duration-normal) var(--ease-in-out);
--transition-moderate: all var(--duration-moderate) var(--ease-out);
--transition-spring:   all var(--duration-moderate) var(--ease-spring);
--transition-color:    color var(--duration-normal) var(--ease-out),
                       background-color var(--duration-normal) var(--ease-out),
                       border-color var(--duration-normal) var(--ease-out);
--transition-shadow:   box-shadow var(--duration-moderate) var(--ease-out);
--transition-opacity:  opacity var(--duration-normal) var(--ease-out);
--transition-transform:transform var(--duration-moderate) var(--ease-spring);
```

---

## 9. Tokens Semânticos — Breakpoints & Grid

### Breakpoints

| Token | Valor | Target Device |
|-------|-------|--------------|
| `--bp-xs` | `320px` | Mobile XS (iPhone SE) |
| `--bp-sm` | `480px` | Mobile L |
| `--bp-md` | `768px` | Tablet |
| `--bp-lg` | `1024px` | Desktop S / iPad Pro |
| `--bp-xl` | `1280px` | Desktop M |
| `--bp-2xl` | `1440px` | Desktop L |
| `--bp-3xl` | `1920px` | Desktop XL / TV |

### Grid System

| Token | Valor | Uso |
|-------|-------|-----|
| `--grid-cols-mobile` | `4` | Colunas em mobile |
| `--grid-cols-tablet` | `8` | Colunas em tablet |
| `--grid-cols-desktop` | `12` | Colunas em desktop |
| `--grid-gutter-sm` | `16px` | Espaço entre colunas (mobile) |
| `--grid-gutter-md` | `24px` | Espaço entre colunas (tablet) |
| `--grid-gutter-lg` | `32px` | Espaço entre colunas (desktop) |
| `--grid-margin-sm` | `16px` | Margem lateral (mobile) |
| `--grid-margin-md` | `32px` | Margem lateral (tablet) |
| `--grid-margin-lg` | `64px` | Margem lateral (desktop) |
| `--container-max` | `1280px` | Largura máxima de container |
| `--container-wide` | `1440px` | Container wide |
| `--container-narrow` | `768px` | Container de conteúdo editorial |

---

## 10. Tokens Semânticos — Z-Index

| Token | Valor | Uso |
|-------|-------|-----|
| `--z-below` | `-1` | Elementos de fundo decorativo |
| `--z-base` | `0` | Conteúdo base |
| `--z-raised` | `1` | Cards com elevação |
| `--z-dropdown` | `10` | Dropdowns, menus |
| `--z-sticky` | `20` | Headers sticky, sidebars |
| `--z-overlay` | `30` | Overlays de fundo |
| `--z-modal` | `40` | Modais |
| `--z-popover` | `50` | Popovers, tooltips |
| `--z-toast` | `60` | Notificações / Toast |
| `--z-spotlight` | `70` | Command palette, search |
| `--z-max` | `9999` | Emergência / debug |

---

## 11. Tokens Semânticos — Opacidade & Blur

### Opacidade

| Token | Valor | Uso |
|-------|-------|-----|
| `--opacity-0` | `0` | Invisível |
| `--opacity-dim` | `0.4` | Elementos desabilitados |
| `--opacity-muted` | `0.6` | Conteúdo secundário |
| `--opacity-subtle` | `0.7` | Hover leve |
| `--opacity-medium` | `0.8` | Glass overlay |
| `--opacity-high` | `0.9` | Quase opaco |
| `--opacity-full` | `1` | Totalmente visível |

---

## 12. Componentes Base

### Botões

#### Anatomia de Token

```
Button
├── background:       --color-primary
├── color:            --color-primary-foreground
├── padding:          --spacing-component-md (y) × --spacing-component-lg (x)
├── border-radius:    --radius-button
├── font-size:        --text-sm
├── font-weight:      --font-semibold
├── shadow (default): none
├── shadow (hover):   --shadow-glow-primary
├── transition:       --transition-spring
└── letter-spacing:   -0.01em
```

#### Variantes

| Variante | BG | Borda | Texto | Uso |
|----------|-----|-------|-------|-----|
| `primary` | `--color-primary` | none | `--color-primary-foreground` | Ação principal |
| `secondary` | `--color-surface-2` | `--color-border-default` | `--color-text-primary` | Ação secundária |
| `ghost` | `transparent` | none | `--color-text-secondary` | Ação terciária |
| `outline` | `transparent` | `--color-border-strong` | `--color-text-primary` | Alternativa a ghost |
| `destructive` | `--color-destructive` | none | `neutral-0` | Delete, ação perigosa |
| `accent-cta` | `--color-accent-cta` | none | `--color-accent-cta-foreground` | CTA de destaque |
| `glass` | `--color-surface-glass` | `--color-border-glass` | `--color-text-primary` | Sobre fundos blur |

#### Tamanhos

| Tamanho | Height | Padding H | Font | Radius |
|---------|--------|-----------|------|--------|
| `xs` | `28px` | `10px` | `--text-xs` | `--radius-sm` |
| `sm` | `32px` | `12px` | `--text-sm` | `--radius-md` |
| `md` | `40px` | `16px` | `--text-sm` | `--radius-md` |
| `lg` | `48px` | `20px` | `--text-base` | `--radius-lg` |
| `xl` | `56px` | `24px` | `--text-lg` | `--radius-lg` |

---

### Cards

#### Card Base

```
Card
├── background:    --color-surface-1
├── border:        1px solid --color-border-subtle
├── border-radius: --radius-card
├── padding:       --spacing-component-lg
├── shadow:        --shadow-sm
├── transition:    --transition-moderate
└── hover → shadow: --shadow-md, translateY(-4px)
```

#### Card Glass

```
Card Glass
├── background:        --color-surface-glass
├── backdrop-filter:   blur(24px) saturate(180%)
├── border:            1px solid --color-border-glass
├── border-radius:     --radius-card
├── padding:           --spacing-component-lg
└── shadow:            --shadow-glass
```

---

### Inputs

```
Input
├── background:    --color-surface-2
├── border:        1px solid --color-border-strong
├── border-radius: --radius-input
├── padding:       12px 16px
├── font-size:     --text-sm
├── color:         --color-text-primary
├── placeholder:   --color-text-tertiary
├── transition:    --transition-normal
├── focus →
│   ├── border-color: --color-border-focus
│   ├── shadow:       0 0 0 3px rgba(124,58,237,0.12)
│   └── outline:      none
└── error →
    ├── border-color: --color-destructive
    └── shadow:       0 0 0 3px rgba(244,63,94,0.12)
```

---

### Badges / Chips

```
Badge
├── background:    --color-surface-3
├── color:         --color-text-secondary
├── padding:       2px 10px
├── border-radius: --radius-full
├── font-size:     --text-xs
└── font-weight:   --font-medium

Badge Variants
├── default:     surface-3 + text-secondary
├── primary:     violet-600/10 + violet-600
├── success:     --color-success-surface + --color-success
├── warning:     --color-warning-surface + --color-warning
├── destructive: --color-destructive-surface + --color-destructive
└── glass:       surface-glass + border-glass + text-primary
```

---

### Avatares

```
Avatar
├── border-radius: --radius-avatar-sm (circular)
├── overflow:      hidden
├── background:    gradient de --color-primary a --color-secondary
└── Tamanhos:
    ├── xs: 24px
    ├── sm: 32px
    ├── md: 40px
    ├── lg: 48px
    ├── xl: 56px
    └── 2xl: 80px
```

---

### Toast / Notifications

```
Toast
├── background:    --color-surface-glass
├── backdrop-blur: --blur-xl
├── border:        1px solid --color-border-glass
├── border-radius: --radius-xl
├── padding:       16px 20px
├── shadow:        --shadow-2xl
├── z-index:       --z-toast
└── Ícone colorido por variante (success/warning/error/info)
```

---

## 13. Padrões de Layout (Bento Grid)

### Estrutura Base

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: minmax(200px, auto);
  gap: var(--space-6);       /* 24px */
}

/* Card normal */
.bento-card { grid-column: span 1; }

/* Card largo */
.bento-card-wide { grid-column: span 2; }

/* Card full */
.bento-card-full { grid-column: span 3; }

/* Card alto */
.bento-card-tall { grid-row: span 2; }
```

### Receitas de Layout

```
Layout 1 — Hero + 3 (mais comum)
┌──────────────────────┬────────┐
│  Hero Card (span 2)  │ Card A │ row 1
├────────┬─────────────┤        │
│ Card B │   Card C   │        │ row 2
└────────┴─────────────┴────────┘

Layout 2 — Dashboard
┌────────┬────────┬────────────┐
│Metric A│Metric B│ Wide Chart │ row 1
├────────┴────────┤            │
│   Card Tall     │            │ row 2
│                 ├──────┬─────┤
│                 │Tag   │ Tag │ row 3
└─────────────────┴──────┴─────┘

Layout 3 — Minimal (2 cols)
┌─────────────────┬───────────┐
│   Main Content  │ Sidebar   │
│   (span 2 of 3) │ (span 1)  │
└─────────────────┴───────────┘
```

---

## 14. Temas: Light / Dark / System

### Estratégia de Implementação

O sistema de temas usa **CSS Custom Properties** que são redefinidas no `:root` para light e em `[data-theme="dark"]` ou via `@media (prefers-color-scheme: dark)` para dark mode.

```css
/* Estratégia recomendada: class + prefers-color-scheme */
:root,
[data-theme="light"] {
  color-scheme: light;
  /* tokens light aqui */
}

[data-theme="dark"],
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    /* tokens dark aqui */
  }
}
```

### Plataformas: Implementação de Tema

| Plataforma | Método de Tema | Dark Mode Auto |
|-----------|----------------|----------------|
| **Web / Next.js** | CSS vars + `data-theme` attr | `prefers-color-scheme` |
| **React Native** | `useColorScheme()` hook | `Appearance.getColorScheme()` |
| **Flutter** | `ThemeData.light/dark()` | `MediaQuery.platformBrightness` |
| **Android XML** | `values-night/colors.xml` | `UiModeManager` |
| **iOS / SwiftUI** | `@Environment(\.colorScheme)` | System automático |
| **Tailwind CSS** | `dark:` prefix + `darkMode: 'class'` | `prefers-color-scheme` |

---

## 15. Variáveis CSS — Implementação

```css
/* ============================================
   AURA DESIGN SYSTEM — CSS CUSTOM PROPERTIES
   ============================================ */

:root {
  /* ── CORES: FUNDO ── */
  --color-background:         #F9FAFB;
  --color-surface-1:          #FFFFFF;
  --color-surface-2:          #F3F4F6;
  --color-surface-3:          #E5E7EB;
  --color-surface-glass:      rgba(255, 255, 255, 0.60);
  --color-surface-overlay:    rgba(255, 255, 255, 0.85);

  /* ── CORES: TEXTO ── */
  --color-text-primary:       #111827;
  --color-text-secondary:     #4B5563;
  --color-text-tertiary:      #9CA3AF;
  --color-text-disabled:      #D1D5DB;
  --color-text-inverse:       #FFFFFF;

  /* ── CORES: BORDA ── */
  --color-border-subtle:      rgba(0, 0, 0, 0.06);
  --color-border-default:     #E5E7EB;
  --color-border-strong:      #D1D5DB;
  --color-border-glass:       rgba(255, 255, 255, 0.20);
  --color-border-focus:       #7C3AED;

  /* ── CORES: BRAND ── */
  --color-primary:            #7C3AED;
  --color-primary-hover:      #6D28D9;
  --color-primary-foreground: #FFFFFF;
  --color-secondary:          #6366F1;
  --color-accent-cta:         #A3E635;
  --color-accent-cta-foreground: #111827;

  /* ── CORES: FEEDBACK ── */
  --color-success:            #84CC16;
  --color-success-surface:    rgba(132, 204, 22, 0.10);
  --color-warning:            #F59E0B;
  --color-warning-surface:    rgba(245, 158, 11, 0.10);
  --color-destructive:        #F43F5E;
  --color-destructive-surface:rgba(244, 63, 94, 0.10);
  --color-info:               #6366F1;
  --color-info-surface:       rgba(99, 102, 241, 0.10);

  /* ── TIPOGRAFIA ── */
  --font-sans:     "Geist Sans", "Inter", -apple-system, sans-serif;
  --font-mono:     "Geist Mono", "JetBrains Mono", monospace;
  --text-xs:       0.75rem;
  --text-sm:       0.875rem;
  --text-base:     1rem;
  --text-lg:       1.125rem;
  --text-xl:       1.25rem;
  --text-2xl:      1.5rem;
  --text-3xl:      1.875rem;
  --text-4xl:      2.25rem;
  --text-5xl:      3rem;
  --font-normal:   400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;
  --font-extrabold:800;
  --font-black:    900;

  /* ── ESPAÇAMENTO ── */
  --space-1:  0.25rem;
  --space-2:  0.5rem;
  --space-3:  0.75rem;
  --space-4:  1rem;
  --space-5:  1.25rem;
  --space-6:  1.5rem;
  --space-8:  2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;

  /* ── RAIOS ── */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-2xl:  20px;
  --radius-3xl:  24px;
  --radius-4xl:  32px;
  --radius-full: 9999px;

  /* ── SOMBRAS ── */
  --shadow-xs:   0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm:   0 2px 8px rgba(0,0,0,0.08);
  --shadow-md:   0 4px 16px rgba(0,0,0,0.10);
  --shadow-lg:   0 8px 30px rgba(0,0,0,0.12);
  --shadow-xl:   0 16px 48px rgba(0,0,0,0.14);
  --shadow-glass:0 8px 32px rgba(0,0,0,0.12),
                 inset 0 1px 0 rgba(255,255,255,0.20);
  --shadow-glow-primary: 0 8px 32px rgba(124,58,237,0.30);
  --shadow-glow-lime:    0 4px 20px rgba(163,230,53,0.25);

  /* ── MOTION ── */
  --duration-fast:     100ms;
  --duration-normal:   200ms;
  --duration-moderate: 300ms;
  --duration-slow:     500ms;
  --ease-out:          cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out:       cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring:       cubic-bezier(0.34, 1.56, 0.64, 1);

  /* ── Z-INDEX ── */
  --z-dropdown: 10;
  --z-sticky:   20;
  --z-overlay:  30;
  --z-modal:    40;
  --z-popover:  50;
  --z-toast:    60;
}

/* ─── DARK MODE ─── */
[data-theme="dark"],
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-background:         #030712;
    --color-surface-1:          #111827;
    --color-surface-2:          #1F2937;
    --color-surface-3:          #374151;
    --color-surface-glass:      rgba(17, 24, 39, 0.60);
    --color-surface-overlay:    rgba(17, 24, 39, 0.85);
    --color-text-primary:       #F9FAFB;
    --color-text-secondary:     #9CA3AF;
    --color-text-tertiary:      #4B5563;
    --color-text-disabled:      #374151;
    --color-text-inverse:       #030712;
    --color-border-subtle:      rgba(255, 255, 255, 0.06);
    --color-border-default:     #374151;
    --color-border-strong:      #4B5563;
    --color-border-glass:       rgba(255, 255, 255, 0.08);
    --color-border-focus:       #8B5CF6;
    --color-primary:            #8B5CF6;
    --color-primary-hover:      #A78BFA;
    --color-secondary:          #818CF8;
    --color-accent-cta:         #BEF264;
    --shadow-sm:   0 2px 8px rgba(0,0,0,0.24);
    --shadow-md:   0 4px 16px rgba(0,0,0,0.30);
    --shadow-lg:   0 8px 30px rgba(0,0,0,0.36);
    --shadow-xl:   0 16px 48px rgba(0,0,0,0.40);
    --shadow-glass:0 8px 32px rgba(0,0,0,0.40),
                   inset 0 1px 0 rgba(255,255,255,0.08);
  }
}
```

---

## 16. Tailwind Config — Extensão

```javascript
// tailwind.config.js
import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", "[data-theme='dark']"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist Sans", "Inter", ...fontFamily.sans],
        mono: ["Geist Mono", "JetBrains Mono", ...fontFamily.mono],
      },
      colors: {
        background:  "var(--color-background)",
        surface: {
          1:       "var(--color-surface-1)",
          2:       "var(--color-surface-2)",
          3:       "var(--color-surface-3)",
          glass:   "var(--color-surface-glass)",
          overlay: "var(--color-surface-overlay)",
        },
        text: {
          primary:   "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary:  "var(--color-text-tertiary)",
          disabled:  "var(--color-text-disabled)",
          inverse:   "var(--color-text-inverse)",
        },
        border: {
          subtle:    "var(--color-border-subtle)",
          default:   "var(--color-border-default)",
          strong:    "var(--color-border-strong)",
          glass:     "var(--color-border-glass)",
          focus:     "var(--color-border-focus)",
        },
        primary:   "var(--color-primary)",
        secondary: "var(--color-secondary)",
        accent:    "var(--color-accent-cta)",
        success:   "var(--color-success)",
        warning:   "var(--color-warning)",
        destructive: "var(--color-destructive)",
        info:      "var(--color-info)",
      },
      borderRadius: {
        sm:   "var(--radius-sm)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        xl:   "var(--radius-xl)",
        "2xl":"var(--radius-2xl)",
        "3xl":"var(--radius-3xl)",
        "4xl":"var(--radius-4xl)",
      },
      boxShadow: {
        xs:           "var(--shadow-xs)",
        sm:           "var(--shadow-sm)",
        md:           "var(--shadow-md)",
        lg:           "var(--shadow-lg)",
        xl:           "var(--shadow-xl)",
        glass:        "var(--shadow-glass)",
        "glow-primary": "var(--shadow-glow-primary)",
        "glow-lime":  "var(--shadow-glow-lime)",
      },
      backdropBlur: {
        xs: "4px", sm: "8px", md: "16px",
        lg: "24px", xl: "40px", "2xl": "64px",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        snappy: "cubic-bezier(0.23, 1, 0.32, 1)",
        bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      animation: {
        "fade-up":    "fadeUp 0.3s ease-out",
        "fade-in":    "fadeIn 0.2s ease-out",
        "scale-in":   "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        "slide-in":   "slideIn 0.3s cubic-bezier(0.23,1,0.32,1)",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideIn: {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(124,58,237,0)" },
          "50%":      { boxShadow: "0 0 32px 8px rgba(124,58,237,0.25)" },
        },
      },
    },
  },
  plugins: [],
};
```

---

## 17. Regras Negativas (Anti-Patterns)

### ❌ Nunca Fazer

| Proibição | Por Quê | Alternativa |
|-----------|---------|-------------|
| `box-shadow: 0 4px 8px black` | Sombra dura, não premium | `rgba(0,0,0,0.12)` com blur generoso |
| `color: red` ou `bg-red-500` | Saturação 100%, agressivo | `--color-destructive` (rose ajustado) |
| `backdrop-filter` sem fallback | Crash em Android WebView antigo | Sempre adicionar `background` sólido como fallback |
| Spinner em ações locais | Quebra Optimistic UI | Atualização imediata de estado local |
| `animation: all 1s linear` | Mecânico, não natural | Usar `ease-out` ou `spring` |
| `z-index: 99999` hardcoded | Não escala | Usar tokens `--z-*` |
| Imagens sem `?auto=format&fit=crop` | Performance quebrada | `https://images.unsplash.com/photo-[ID]?auto=format&fit=crop&w=800&q=80` |
| Fontes genéricas (Arial, system) | Design sem identidade | `Geist Sans` + fallbacks adequados |
| `border: 1px solid black` | Contraste duro | `--color-border-default` com opacidade |
| `transition: none` em botões | UX sem resposta | Sempre `--transition-fast` mínimo |

---

## 18. Compatibilidade Cross-Platform

### Web (Next.js / React)
- CSS Custom Properties nativas
- `backdrop-filter` com prefixo `-webkit-`
- Framer Motion para animações
- Tailwind CSS para utilitários

### React Native / Expo
```javascript
// Mapeamento de tokens para StyleSheet
export const tokens = {
  colors: {
    background: { light: '#F9FAFB', dark: '#030712' },
    surface1:   { light: '#FFFFFF', dark: '#111827' },
    textPrimary:{ light: '#111827', dark: '#F9FAFB' },
    primary:    { light: '#7C3AED', dark: '#8B5CF6' },
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 },
  radius:  { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  // Glass em RN: usar @react-native-community/blur
};
```

### Flutter
```dart
// Tokens em ThemeData
final auraTheme = ThemeData(
  colorScheme: ColorScheme.fromSeed(
    seedColor: const Color(0xFF7C3AED), // violet-600
    brightness: Brightness.light,
  ),
  cardTheme: const CardTheme(
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(16)),
    ),
  ),
);
```

### Android (XML)
```xml
<!-- res/values/colors.xml -->
<resources>
  <color name="color_background">#FFF9FAFB</color>
  <color name="color_surface_1">#FFFFFFFF</color>
  <color name="color_primary">#FF7C3AED</color>
  <color name="color_text_primary">#FF111827</color>
</resources>

<!-- res/values-night/colors.xml -->
<resources>
  <color name="color_background">#FF030712</color>
  <color name="color_surface_1">#FF111827</color>
  <color name="color_primary">#FF8B5CF6</color>
  <color name="color_text_primary">#FFF9FAFB</color>
</resources>
```

### iOS / SwiftUI
```swift
// Extensão de Color
extension Color {
  static let auraBackground = Color("AuraBackground")
  static let auraPrimary    = Color("AuraPrimary")
  static let auraTextPrimary = Color("AuraTextPrimary")
  // Definir em Assets.xcassets com Appearances Light/Dark
}
```

---

## 19. Checklist de Qualidade

### Antes de Publicar um Componente

**Cores & Contraste**
- [ ] Todos os textos atingem WCAG AA (4.5:1 para texto normal, 3:1 para texto grande)
- [ ] Nenhuma cor raw — apenas tokens semânticos
- [ ] Dark mode testado e aprovado
- [ ] Nenhuma sombra com `black` puro (sem opacidade)

**Tipografia**
- [ ] Hierarquia visual clara (mínimo 2 tamanhos distintos por componente)
- [ ] Font weight segue escala semântica
- [ ] Line-height adequado para legibilidade

**Espaçamento & Layout**
- [ ] Todo espaçamento em múltiplos de 4px
- [ ] Testado em mobile (320px mínimo)
- [ ] Grid não quebra em viewport intermediário (768px)

**Animação & Interação**
- [ ] Nenhuma animação `linear` em elementos de UI
- [ ] Hover e focus states visíveis
- [ ] `prefers-reduced-motion` respeitado

**Performance**
- [ ] Nenhum spinner para ações locais (Optimistic UI)
- [ ] `backdrop-filter` tem fallback de background
- [ ] Imagens com parâmetros de otimização

**Código**
- [ ] Tokens CSS usados, sem valores hardcoded
- [ ] Componente funciona sem JavaScript (progressive enhancement)
- [ ] TypeScript types definidos para variantes

---

## Créditos & Referências

- **Inspiração Visual:** Apple HIG, Linear Design, Vercel Design System
- **Sistema de Tokens:** Theo's T3 Tokens, Style Dictionary, shadcn/ui
- **Glassmorphism:** iOS 26 Liquid Glass principles + adaptação web
- **Motion:** Framer Motion, iOS UIKit Spring animations
- **Grid:** Refactoring UI (Adam Wathan & Steve Schoger)

---

*© 2026 Aura Design System — MIT License — Versão 1.0.0*
