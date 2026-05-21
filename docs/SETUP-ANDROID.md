# Rodar no Android Studio — passo a passo

Este guia serve para **você** e para **outra pessoa** que clonou o repositório. Todos usam o **mesmo Firebase** (`financy-4d5f7`) — mesmos logins e dados na nuvem.

---

## O que instalar (uma vez na máquina)

1. **Node.js 18+** — https://nodejs.org  
2. **Android Studio** (versão recente) — https://developer.android.com/studio  
   - Na instalação, marque: **Android SDK**, **Android SDK Platform**, **Android Virtual Device** (emulador).
3. **Git** — para clonar o projeto.

No Android Studio, na primeira abertura:
- **More Actions → SDK Manager** → instale **Android 14 ou 15** (API 34/35) e **Build-Tools**.

---

## 1. Clonar e instalar dependências

```powershell
git clone https://github.com/SEU_USUARIO/Financy-Tracker.git
cd Financy-Tracker
npm install
```

*(Troque a URL pelo repositório real do GitHub.)*

---

## 2. Sincronizar o app (obrigatório antes do Android Studio)

```powershell
npm run cap:sync
```

Isso gera a pasta `www/` e copia o site para o projeto Android.

**Sempre que mudar HTML/CSS/JS**, rode de novo:

```powershell
npm run cap:sync
```

---

## 3. Abrir no Android Studio

```powershell
npm run cap:open
```

Ou: Android Studio → **Open** → pasta `Financy-Tracker/android` (não a raiz do repo).

Aguarde o **Gradle Sync** terminar (barra embaixo). Na primeira vez pode demorar vários minutos.

---

## 4. Emulador ou celular

### Emulador (sem cabo)

1. Android Studio → **Device Manager** (ícone de celular).  
2. **Create Device** → escolha um modelo (ex. Pixel 6) → sistema **API 34+**.  
3. Inicie o emulador (▶).

### Celular físico

1. No celular: **Opções do desenvolvedor** → **Depuração USB** ativada.  
2. Conecte o cabo USB.  
3. Aceite “Permitir depuração USB” no celular.  
4. No Android Studio, selecione o aparelho no menu ao lado do botão ▶ **Run**.

---

## 5. Rodar o app

1. Selecione o módulo **app**.  
2. Clique em **Run** (▶) ou `Shift+F10`.  
3. O app **Finance Tracker** abre no emulador/celular.

Login **e-mail/senha** e **Firestore** funcionam assim que o Firebase do projeto estiver configurado (ver seção 7).

---

## 6. Login Google no Android (SHA-1 — importante)

O Google no **app Android** só funciona se o **SHA-1 do certificado de debug da sua máquina** estiver cadastrado no Firebase.

### 6.1 Ver seu SHA-1 (Windows)

Na raiz do projeto:

```powershell
npm run android:sha1
```

Copie a linha **SHA1** da variante **debug** (algo como `AA:BB:CC:...`).

### 6.2 Cadastrar no Firebase

1. Abra: https://console.firebase.google.com/project/financy-4d5f7/settings/general  
2. Em **Seus apps**, selecione o app **Android** (`com.financetracker.app`).  
3. **Adicionar impressão digital** → cole o SHA-1 → Salvar.  
4. Baixe o novo **`google-services.json`**.  
5. Substitua o arquivo em:  
   `android/app/google-services.json`  
6. Commit no Git (para o time usar o mesmo arquivo) ou envie o arquivo para quem mantém o repo.  
7. Rode de novo: `npm run cap:sync` e **Run** no Android Studio.

**Cada desenvolvedor/emulador em outro PC** pode precisar do **próprio** SHA-1 adicionado no mesmo projeto Firebase (várias impressões digitais no mesmo app Android).

### 6.3 Web Client ID (já no projeto)

Não precisa alterar se clonou o repo atual:

- `assets/js/firebase-config.js` → `googleWebClientId`  
- `android/app/src/main/res/values/strings.xml` → `default_web_client_id`  

Os dois devem ser **iguais** (ID do cliente Web do Firebase → Authentication → Google).

---

## 7. Firebase (quem mantém o projeto — uma vez)

No Console **financy-4d5f7**:

| Item | Onde |
|------|------|
| E-mail/senha + Google | Authentication → Sign-in method |
| Regras do banco | Firestore → Regras → colar `firestore.rules` → **Publicar** |
| Domínio local (web) | Authentication → Settings → Authorized domains → `localhost` |

Quem só **clona e roda** não precisa criar outro Firebase — usa o mesmo `firebase-config.js` do repositório.

---

## 8. Comandos úteis

| Comando | Uso |
|---------|-----|
| `npm start` | Testar no navegador (`http://localhost:5050`) |
| `npm run www:prepare` | Só gerar `www/` |
| `npm run cap:sync` | Copiar web → Android (após mudanças no código) |
| `npm run cap:open` | Abrir pasta `android` no Android Studio |
| `npm run android:sha1` | Mostrar SHA-1 para cadastrar no Firebase |

---

## 9. Problemas comuns

| Problema | Solução |
|----------|---------|
| Gradle sync falhou | Android Studio → File → **Sync Project with Gradle Files**; verifique internet. |
| App abre tela branca | Rode `npm run cap:sync` de novo. |
| “Sem permissão no Firestore” | Publicar `firestore.rules` no Console (seção 7). |
| Google não funciona no Android | Adicionar SHA-1 (seção 6) e atualizar `google-services.json`. |
| Mudanças no JS não aparecem | `npm run cap:sync` → Run de novo no Android Studio. |
| `www` não existe | `npm run www:prepare` ou `npm run cap:sync`. |

---

## Resumo para outra pessoa ver o mesmo estado que você

1. Clonar o **mesmo** repositório (com `firebase-config.js` e `google-services.json`).  
2. `npm install` → `npm run cap:sync` → `npm run cap:open` → Run.  
3. Adicionar **SHA-1 dela** no Firebase se for testar **Google no Android**.  
4. Não criar outro projeto Firebase — dados e contas são os mesmos na nuvem.
