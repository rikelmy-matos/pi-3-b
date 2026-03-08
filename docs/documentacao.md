# Documentação do Projeto
## Sistema Gerenciador de Tarefas Online — PROMINESS LTDA
### Projeto Integrador III-B (11304921012_20261_01)

---

## 1. Contextualização Extensionista

O presente projeto foi desenvolvido em parceria com a **PROMINESS LTDA**, empresa brasileira de desenvolvimento de software. A iniciativa insere-se no contexto da extensão universitária, buscando aplicar conhecimentos técnicos adquiridos ao longo do curso na resolução de um problema real identificado junto ao parceiro.

A PROMINESS LTDA apontou como principal necessidade a falta de uma ferramenta centralizada para o acompanhamento de projetos e tarefas internas. A ausência de visibilidade sobre o andamento das atividades dificultava a comunicação entre os membros das equipes, comprometia o cumprimento de prazos e tornava a gestão de projetos dependente de planilhas e mensagens informais.

A solução proposta — um sistema web de gerenciamento de tarefas — visa resolver diretamente essas dores, proporcionando ao parceiro uma plataforma colaborativa, acessível via navegador e adequada ao fluxo de trabalho de equipes de desenvolvimento de software.

---

## 2. Descrição da Solução Proposta

O **Sistema Gerenciador de Tarefas Online** é uma aplicação web full-stack que permite o gerenciamento completo de projetos e tarefas. A solução é composta por um backend de API REST e um frontend de página única (SPA), ambos containerizados e implantados em infraestrutura de nuvem.

### 2.1 Funcionalidades Implementadas

#### Autenticação e Controle de Acesso
- Cadastro de usuários mediante **token de convite** (sistema de convite fechado), garantindo que apenas pessoas autorizadas acessem o sistema
- Login com **e-mail e senha**; autenticação via **JWT** (JSON Web Token) com tokens de acesso de 15 minutos e refresh de 7 dias com rotação automática
- Perfil de usuário editável: nome, bio e foto de avatar (upload com validação de tipo e tamanho)
- Troca de senha autenticada com validação do senha atual
- **Painel administrativo** exclusivo para usuários staff: gerenciamento de usuários (promoção, rebaixamento e exclusão de contas não-staff) e gestão de tokens de convite

#### Gerenciamento de Projetos
- Criação de projetos com nome, descrição, datas de início e entrega e status (`ativo`, `pausado`, `concluído`, `arquivado`)
- Gerenciamento de membros com papéis distintos: `owner`, `admin`, `membro`, `visualizador`
- Informações complementares por projeto: **orçamento** (estimado vs. realizado em BRL/USD/EUR), **stack tecnológica**, **objetivos**, **riscos** (probabilidade e impacto) e **marcos** com percentual de conclusão
- Visão geral do projeto em 7 abas: Visão Geral, Orçamento, Equipe, Arquitetura, Objetivos, Riscos e Marcos
- Feed de atividades do projeto

#### Gerenciamento de Tarefas e Quadro Kanban
- Criação de tarefas com título, descrição, prioridade (`baixa`, `média`, `alta`, `crítica`), responsável, data de entrega e posição no quadro
- **Quadro Kanban** com colunas configuráveis — padrão: "A Fazer", "Em Andamento" e "Concluído"
- Drag-and-drop para mover tarefas entre colunas, com atualização em tempo real via API
- Comentários nas tarefas com histórico de atividades (movimentações, atribuições, criações)
- Diferenciação visual por prioridade (borda colorida lateral nas tarefas)

#### Calendário
- Integração com **FullCalendar** exibindo as datas de entrega de todas as tarefas do usuário
- Eventos coloridos por prioridade para rápida identificação de urgências

#### Dashboard
- 4 cartões de estatísticas: total de projetos, total de tarefas, tarefas concluídas e tarefas em atraso
- 2 gráficos de barras: distribuição de tarefas por status e por prioridade

### 2.2 Restrições e Decisões de Design
- O campo de login é o **e-mail** (não o nome de usuário)
- O registro é **fechado por token de convite** — staff cria tokens com nota e validade opcional
- Usuários não-staff não podem excluir projetos ou alterar membros de projetos dos quais não são donos/admins
- Staff não pode excluir a própria conta nem a de outros usuários staff

---

## 3. Metodologia de Desenvolvimento

### 3.1 Stack Tecnológica

#### Backend
| Componente | Tecnologia |
|---|---|
| Linguagem | Python 3.12 |
| Framework | Django 5 + Django REST Framework |
| Autenticação | SimpleJWT (JWT com rotação de refresh token) |
| Banco de Dados | PostgreSQL 16 |
| Servidor de Aplicação | Gunicorn |
| Arquivos Estáticos | WhiteNoise com compressão |
| Documentação da API | drf-spectacular (OpenAPI / Swagger UI em `/api/docs/`) |

#### Frontend
| Componente | Tecnologia |
|---|---|
| Linguagem | TypeScript (strict) |
| Framework | React 18 |
| Build Tool | Vite |
| Biblioteca de UI | MUI v7 (Material UI) |
| Estado de Servidor | TanStack Query v5 |
| Roteamento | React Router v6 |
| Drag-and-Drop | @hello-pangea/dnd |
| Calendário | FullCalendar |
| HTTP Client | Axios com interceptor de refresh automático |

#### DevOps e Infraestrutura
| Componente | Tecnologia |
|---|---|
| Containerização | Docker (multi-stage, Alpine) |
| Registry | GitHub Container Registry (GHCR) |
| CI/CD | GitHub Actions |
| Orquestração | Kubernetes via K3S (LTS) |
| Empacotamento K8S | Helm 3 |
| GitOps | Argo CD |
| Servidor | VPS Hostinger — Ubuntu 24.04 LTS |
| Ingress | ingress-nginx com TLS (cert-manager + Let's Encrypt) |
| Domínio | sofplan.com.br |

### 3.2 Processo de Desenvolvimento

O desenvolvimento seguiu uma abordagem iterativa inspirada em metodologias ágeis, com entregas incrementais organizadas no Trello. As tarefas foram distribuídas em quatro colunas: **Backlog**, **Ready**, **Em Andamento** e **Concluído**.

O controle de versão foi realizado via **Git/GitHub** com commits atômicos e descritivos seguindo a convenção *Conventional Commits* (ex.: `feat:`, `fix:`, `docs:`, `ci:`). O repositório principal está disponível em: `https://github.com/rikelmy-matos/pi-3-b`.

### 3.3 Arquitetura do Sistema

```
Usuário (Navegador)
        │
        ▼
  ingress-nginx (TLS)
  sofplan.com.br
        │
   ┌────┴────┐
   │         │
Frontend   Backend
(nginx)   (Gunicorn/Django)
           │
           ▼
       PostgreSQL
       (StatefulSet + PVC)
```

Todos os componentes rodam em **pods Kubernetes** gerenciados pelo K3S na VPS. O Helm chart próprio (`helm/taskmanager`) define todos os recursos: Deployments, Services, Ingress, StatefulSet (PostgreSQL), PersistentVolumeClaims, ConfigMap, Secret, NetworkPolicy, HPA e PodDisruptionBudget.

### 3.4 Pipeline de CI/CD

O pipeline automatizado é executado a cada push na branch `main`:

1. **build-backend**: compila e publica a imagem Docker do backend no GHCR com a tag `sha-<hash>` e `latest`
2. **build-frontend**: compila o bundle React (TypeScript estrito via `tsc -b`) e publica a imagem do frontend
3. **update-helm**: atualiza automaticamente os campos `backend.tag` e `frontend.tag` no arquivo `helm/taskmanager/values.yaml` com o SHA do commit, commita e faz push de volta para `main`

Dessa forma, o repositório GitOps (`https://github.com/AutomataReplicant/GitOps`, privado) sempre reflete exatamente quais imagens estão em produção.

---

## 4. Gestão do Projeto

### 4.1 Ferramenta de Gestão
A gestão do projeto foi realizada no **Trello**, com quadro organizado em 4 colunas:

| Coluna | Descrição |
|---|---|
| **Backlog** | Tarefas identificadas ainda não iniciadas |
| **Ready** | Tarefas priorizadas e prontas para execução |
| **Em Andamento** | Tarefas em execução no momento |
| **Concluído** | Tarefas finalizadas e validadas |

As tarefas foram categorizadas com etiquetas coloridas: **DevOps** (azul), **Backend** (verde), **Frontend** (roxo), **Infra** (laranja), **Segurança** (vermelho) e **Documentação** (amarelo).

### 4.2 Tarefas Concluídas

| Tarefa | Categoria |
|---|---|
| Definir empresa parceira (PROMINESS LTDA) | Documentação |
| Definir escopo do sistema | Documentação |
| Definir ferramentas de desenvolvimento | Backend, Frontend |
| Definir ferramentas de DevOps | DevOps, Infra |
| Preencher documentos acadêmicos (Termo de Participação, Carta de Início) | Documentação |
| Desenhar arquitetura do sistema | Documentação, Infra |
| Subir VPS na Hostinger (Ubuntu 24.04 LTS) | Infra |
| Instalar e configurar K3S | Infra |
| Criar Dockerfiles multi-stage (Alpine) | DevOps |
| Criar Helm Chart com PostgreSQL e PVC | Infra, DevOps |
| Desenvolver Backend (Django + DRF, 71 testes) | Backend |
| Desenvolver Frontend (React + TypeScript + MUI v7) | Frontend |
| Criar Pipeline CI/CD (GitHub Actions) | DevOps |
| Criar repositório GitOps (`AutomataReplicant/GitOps`) | DevOps, Infra |

### 4.3 Tarefas Pendentes (Backlog)

| Tarefa | Descrição |
|---|---|
| Instalar Argo CD no cluster K3S | Expor via Ingress/TLS; conectar ao repositório GitOps; criar Application |
| Configurar Argo CD Image Updater | Automatizar atualização de tags no repositório GitOps ao detectar novas imagens no GHCR |

---

## 5. Descrição das Funcionalidades Implementadas

### 5.1 Módulo de Autenticação (`/api/v1/auth/`)

| Endpoint | Método | Descrição |
|---|---|---|
| `/auth/register/` | POST | Cadastro com token de convite |
| `/auth/token/` | POST | Login → tokens JWT |
| `/auth/token/refresh/` | POST | Renovação do access token |
| `/auth/profile/` | GET / PATCH | Consulta e atualização do perfil (suporta multipart para avatar) |
| `/auth/avatar/` | DELETE | Remove avatar e exclui arquivo do disco |
| `/auth/change-password/` | POST | Troca de senha autenticada |
| `/auth/users/` | GET | Busca de usuários para atribuição de tarefas (mínimo 2 caracteres) |
| `/auth/admin/users/` | GET | Lista todos os usuários — staff apenas |
| `/auth/admin/users/<id>/set-staff/` | PATCH | Promove ou rebaixa staff |
| `/auth/admin/users/<id>/delete/` | DELETE | Exclui usuário não-staff |
| `/auth/admin/invite-tokens/` | GET / POST | Lista e cria tokens de convite |
| `/auth/admin/invite-tokens/<id>/` | DELETE | Revoga token de convite |

### 5.2 Módulo de Projetos (`/api/v1/projects/`)

| Endpoint | Método | Descrição |
|---|---|---|
| `/projects/` | GET / POST | Lista projetos do usuário / cria projeto |
| `/projects/<id>/` | GET / PATCH / DELETE | Detalhe, edição e exclusão |
| `/projects/<id>/members/` | POST | Adiciona membro |
| `/projects/<id>/members/<userId>/` | DELETE | Remove membro |
| `/projects/<id>/members/<userId>/update/` | PATCH | Atualiza especialidade, cargo e valor/hora |
| `/projects/<id>/members-overview/` | GET | Visão geral dos membros com estatísticas de tarefas |
| `/projects/<id>/activity/` | GET | Feed de atividades |
| `/projects/<id>/budget/` | GET / PUT / PATCH | Consulta e atualização do orçamento |
| `/projects/<id>/tech-stack/` | GET / POST | Gerencia stack tecnológica |
| `/projects/<id>/objectives/` | GET / POST | Gerencia objetivos |
| `/projects/<id>/risks/` | GET / POST | Gerencia riscos |
| `/projects/<id>/milestones/` | GET / POST | Gerencia marcos |

### 5.3 Módulo de Tarefas (`/api/v1/`)

| Endpoint | Método | Descrição |
|---|---|---|
| `/tasks/` | GET / POST | Lista tarefas do usuário / cria tarefa |
| `/tasks/<id>/` | GET / PATCH / DELETE | Detalhe, edição e exclusão |
| `/tasks/<id>/move/` | PATCH | Move tarefa no Kanban (atualiza status e posição) |
| `/tasks/<id>/comments/` | GET / POST | Comentários na tarefa |
| `/columns/` | GET / POST | Gerencia colunas Kanban |
| `/columns/<id>/` | GET / PATCH / DELETE | Detalhe, edição e exclusão de coluna |

### 5.4 Telas do Frontend

| Rota | Tela | Descrição |
|---|---|---|
| `/login` | Login | Autenticação com e-mail e senha |
| `/register` | Cadastro | Registro com token de convite |
| `/` | Dashboard | Estatísticas gerais e gráficos |
| `/projects` | Projetos | Lista com busca e filtro por status |
| `/projects/new` | Novo Projeto | Formulário de criação |
| `/projects/:id` | Kanban | Quadro Kanban com drag-and-drop |
| `/projects/:id/members` | Membros | Gerenciamento de membros do projeto |
| `/projects/:id/overview` | Detalhe do Projeto | 7 abas de informações do projeto |
| `/calendar` | Calendário | Visualização de tarefas por data de entrega |
| `/profile` | Perfil | Edição de dados pessoais, avatar e senha |
| `/admin` | Administração | Painel staff: usuários e tokens de convite |

---

## 6. Qualidade e Testes

O backend possui **71 testes automatizados** cobrindo os três módulos da aplicação:

| Módulo | Testes |
|---|---|
| `users` | 28 |
| `projects` | 22 |
| `tasks` | 18 |
| **Total** | **71** |

Os testes cobrem: criação e validação de modelos, autenticação e permissões, regras de negócio (ex.: não é possível excluir usuário staff, não é possível criar tarefa sem ser membro do projeto), e casos de erro esperados (400, 401, 403, 404).

---

## 7. Segurança

As seguintes medidas de segurança foram implementadas:

- **JWT de curta duração** (15 min) com rotação e blacklist de refresh tokens
- **Throttling** de requisições: 60/min para anônimos, 300/min para autenticados
- **HSTS** com 1 ano, subdomínios e preload (produção)
- **SSL redirect** forçado em produção
- **CORS** restrito aos domínios autorizados (`sofplan.com.br`)
- Validação de avatar: tipos permitidos (jpg, jpeg, png, gif, webp) e tamanho máximo de 2 MB
- Registro fechado por token de convite de uso único com expiração opcional
- Endpoints administrativos protegidos por permissão `IsStaff` customizada
- NetworkPolicy no Kubernetes restringindo comunicação entre pods

---

## 8. Perspectivas de Melhorias Futuras

- **Argo CD** com entrega contínua automatizada via GitOps (em andamento)
- **Argo CD Image Updater** para atualização automática de imagens sem intervenção manual
- Notificações em tempo real via WebSocket (Django Channels)
- Relatórios exportáveis em PDF/CSV por projeto
- Integração com ferramentas externas (Slack, e-mail)
- Aplicativo mobile (React Native ou PWA)
- Suporte a múltiplos idiomas (i18n)
- Autenticação via OAuth2 (Google, GitHub)

---

## 9. Repositório e Acesso

| Item | Endereço |
|---|---|
| Repositório principal | https://github.com/rikelmy-matos/pi-3-b |
| Repositório GitOps | https://github.com/AutomataReplicant/GitOps (privado) |
| Aplicação em produção | https://sofplan.com.br |
| Documentação da API | https://sofplan.com.br/api/docs/ |
| Usuário padrão (admin) | email: `admin@admin.com` / senha: `admin` — **alterar no primeiro acesso** |
