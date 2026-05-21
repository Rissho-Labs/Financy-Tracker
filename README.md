# Finance Tracker

Finance Tracker é um aplicativo web voltado para o controle de finanças pessoais, com foco na gestão de despesas e uso de cartões de crédito. O projeto conta com uma interface moderna e foi projetado para rodar tanto como uma aplicação web comum quanto como um aplicativo nativo para Android utilizando o **Capacitor**.

Esta documentação fornece os passos e configurações de ambiente necessários para clonar, configurar e executar este projeto de forma integral em qualquer dispositivo.

---

## 🛠️ Tecnologias e Dependências

O projeto utiliza um conjunto simples de tecnologias web no front-end, empacotadas via Capacitor para dispositivos móveis:

- **HTML5, CSS3, Vanilla JavaScript**: Para toda a interface e lógica de front-end.
- **Node.js e NPM**: Gerenciadores de pacote do projeto.
- **Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`)**: Ferramenta oficial do Ionic que encapsula aplicações web em projetos nativos (Android/iOS).
- **Serve (`serve`)**: Pacote local para servir os arquivos web durante o desenvolvimento.

## ⚙️ Pré-requisitos (Configuração de Ambiente)

Para conseguir rodar o projeto inteiramente na sua máquina local, certifique-se de que você possui o seguinte instalado:

1. **Git**: Para clonar o repositório.
2. **Node.js** (versão 18.x ou superior recomendada): Essencial para instalar os pacotes NPM e rodar os scripts.
3. **Android Studio**: Necessário se você deseja compilar, emular e visualizar o aplicativo Android (caso não queira ver a versão Android, não é estritamente obrigatório, o web rodará normalmente).

---

## 🚀 Instalação e Configuração

### 1. Clonar o Repositório
Abra o seu terminal ou prompt de comando e clone o projeto:
```bash
git clone https://github.com/Rissho-Labs/Financy-Tracker.git
cd Financy-Tracker
```

### 2. Instalar as Dependências
O projeto conta com o arquivo `package.json` definindo as bibliotecas e ferramentas necessárias para o ambiente de desenvolvimento. Rode:
```bash
npm install
```
Isso fará o download e instalação local do Capacitor e do módulo `serve`.

---

## 💻 Executando o Projeto (Web)

Para executar o projeto como uma aplicação Web no seu navegador (com um servidor local), utilize o script predefinido no `package.json`:

```bash
npm start
```
*(Alternativamente: `npm run serve`)*

**O que este comando faz:**
1. Ele aciona o script `npm run www:prepare` (que roda o arquivo `scripts/prepare-www.mjs`) para preparar os arquivos da pasta web (como copiar ou organizar o HTML/CSS/JS base no diretório `www`).
2. Ele inicia um servidor local rodando através do `serve` na porta configurada.
3. Por padrão, você poderá acessar o sistema no navegador por: `http://localhost:5050`

---

## 📱 Executando no Android Studio

Guia completo (emulador, celular, Google, Firebase, SHA-1 para o time):

**[docs/SETUP-ANDROID.md](docs/SETUP-ANDROID.md)**

### Resumo rápido

```bash
npm install
npm run cap:sync
npm run cap:open
```

No Android Studio: aguarde o Gradle, escolha emulador ou celular, clique em **Run** (▶).

**Login Google no Android:** cada máquina precisa do SHA-1 no Firebase:

```bash
npm run android:sha1
```

Copie o SHA-1 (debug) → [Firebase → app Android](https://console.firebase.google.com/project/financy-4d5f7/settings/general) → Adicionar impressão digital → baixar `google-services.json` → colar em `android/app/` → `npm run cap:sync`.

### Mesmo estado / dados para todo o time

- O repositório já traz `firebase-config.js` e `google-services.json` (projeto **financy-4d5f7**).
- Firestore: publique `firestore.rules` no Console (uma vez).
- Contas e perfis são **compartilhados** na nuvem — não é preciso outro Firebase por pessoa.
- Biometria e cache local ficam só no aparelho de quem ativou.

---

## 🗂️ Estrutura de Diretórios e Arquivos

Entender a organização do projeto é vital para a manutenção:

- `/assets/`: Contém arquivos de estilização (CSS) e lógica do usuário (JS). Subpastas dividem o código por página/componente.
- `/pages/`: Os arquivos HTML individuais para cada tela (home, profile, cards, onboarding, etc).
- `/index.html`: Arquivo raiz da aplicação e ponto de entrada.
- `/scripts/`: Scripts automatizados para desenvolvimento (como o `prepare-www.mjs`).
- `/android/`: O código fonte nativo do aplicativo Android configurado e gerado pelo Capacitor. 
- `capacitor.config.json`: Arquivo de configuração essencial do Capacitor. Define o ID do app, nome e o diretório base web.
- `package.json`: Lista todas as dependências, versionamento e scripts que orquestram a aplicação.

---

## 🔧 Solução de Problemas Comuns

- **Porta Ocupada (`npm start`)**: Se a porta 5050 estiver em uso, você pode alterar o script de `"start"` no `package.json` para refletir a porta desejada, ex: `serve www -l 3000`.
- **Erro de Gradle no Android Studio**: Ao abrir com `npm run cap:open`, o Android Studio pode precisar atualizar a versão do Gradle. É recomendado permitir que a IDE realize as sincronizações necessárias na primeira vez que o projeto for aberto.
- **Mudanças não aparecem no App Android**: Lembre-se sempre de rodar o `npm run cap:sync` depois de alterar o HTML/CSS/JS e ANTES de compilar novamente no Android Studio.
