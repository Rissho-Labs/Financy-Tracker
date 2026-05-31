# Financy Tracker — Arquitetura (Feature-Sliced Design)

**Responsável técnico:** Rickson.Hirata  
**Versão:** 1.0.0 · Node LTS · Firebase SDK · Capacitor 8.x

## Estrutura

```
src/
├── app/           # Entrada (index.html, app.js)
├── assets/        # Mídia estática (ícones, splash)
├── core/          # Serviços globais (auth, firebase, storage, routes)
├── features/      # Domínios de negócio (HTML + CSS + JS co-localizados)
│   ├── auth/
│   ├── biometrics/
│   ├── cards/
│   ├── goals/
│   └── transactions/
├── shared/        # Componentes reutilizáveis (notificações, consentimento IA)
└── styles/        # tokens.css · reset.css · global.css
```

## Build

`npm run www:prepare` gera bundles em `src/core/` e copia `src/` → `www/` para Capacitor e deploy.

## Segurança

- **Firestore/Storage:** privilégio mínimo — `userId == request.auth.uid`
- **Biometria:** apenas Keychain/Keystore via Capacitor; nenhum dado biométrico trafega ao backend
- **IA (LGPD):** consentimento explícito via `FTAiConsent` antes de enviar imagens

## Rotas

Centralizadas em `src/core/ft-routes.js` (`window.FTRoutes`).
