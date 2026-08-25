# Documentacao do Frontend

## Visao geral

Frontend Angular da plataforma MediShop, responsavel pela experiencia Web do
e-commerce de cursos e equipamentos.

O projeto atende:

- catalogo publico;
- carrinho de compras;
- checkout;
- cadastro e login;
- gerenciamento de conta;
- painel administrativo;
- consumo da API .NET.

## Tecnologias

- Angular 21
- TypeScript 5.9
- RxJS
- SCSS
- Angular Reactive Forms
- Angular Signals
- Vitest
- Lucide Angular

## Estrutura principal

```text
src/
  app/
    core/
      guards/
      interceptors/
      models/
      services/
    features/
      account/
      admin/
      auth/
      cart/
      checkout/
      home/
      landing/
    app.config.ts
    app.routes.ts
  main.ts
  styles.scss
public/
```

### Core

Contem recursos compartilhados da aplicacao:

- `services`: comunicacao com a API e regras de estado;
- `models`: contratos TypeScript;
- `guards`: protecao das rotas autenticadas e administrativas;
- `interceptors`: inclusao do token JWT nas requisicoes.

### Features

Cada funcionalidade possui seu componente, template, estilos e testes:

- `landing`: pagina inicial;
- `home`: catalogo de produtos e cursos;
- `auth`: login e cadastro;
- `cart`: carrinho persistido no navegador;
- `checkout`: endereco, cupom, frete e criacao do pedido;
- `account`: perfil e endereco;
- `admin`: produtos, pedidos, alunos, cupons e indicadores.

## Executando localmente

Na pasta do projeto:

```bash
npm install
npm start
```

Abra:

```text
http://localhost:4200
```

Para gerar o build de producao:

```bash
npm run build
```

Para executar os testes:

```bash
npm test -- --watch=false
```

## Integracao com a API

Atualmente os servicos usam a URL:

```text
http://localhost:5278/api
```

Essa URL esta declarada nos servicos:

- `AuthService`;
- `ProductService`;
- `OrderService`;
- `PromoCodeService`;
- `StudentService`.

Antes do deploy, recomenda-se mover a URL para arquivos de ambiente do
Angular, evitando valores fixos no codigo.

## Rotas da aplicacao

| Rota | Acesso | Funcao |
|---|---|---|
| `/` | Publico | Landing page |
| `/catalogo` | Publico | Catalogo de produtos e cursos |
| `/login` | Publico | Login e cadastro |
| `/carrinho` | Publico | Itens selecionados |
| `/checkout` | Autenticado | Finalizacao da compra |
| `/conta` | Autenticado | Perfil e endereco |
| `/admin` | Administrador | Painel administrativo |

Rotas autenticadas usam `authGuard`. A rota administrativa usa
`adminGuard`, que exige usuario autenticado com role `Admin`.

## Autenticacao

O login utiliza:

```http
POST /api/Auth/login
```

Payload:

```json
{
  "email": "usuario@example.com",
  "senha": "senha-segura"
}
```

Resposta esperada:

```json
{
  "accessToken": "jwt",
  "refreshToken": "refresh-token",
  "expiresIn": 86400,
  "user": {
    "id": 1,
    "nome": "Usuario",
    "email": "usuario@example.com",
    "role": "Cliente"
  }
}
```

O `AuthService` armazena:

- access token em `medishop_token`;
- refresh token em `medishop_refresh_token`;
- usuario em `medishop_user`.

O `authInterceptor` envia automaticamente:

```http
Authorization: Bearer <access-token>
```

## Servicos da API

### AuthService

```text
login()
register()
updateProfile()
logout()
getToken()
getRefreshToken()
isAuthenticated()
isAdmin()
```

### ProductService

```text
getAll()
getById()
create()
update()
delete()
```

O catalogo de cursos pode ser filtrado com:

```http
GET /api/Products?tipo=course
```

### OrderService

```text
create()
getMyOrders()
getAll()
updateStatus()
```

### PromoCodeService

```text
getAll()
create()
update()
delete()
validate()
```

### StudentService

```text
getAll()
create()
update()
delete()
```

## Fluxo de compra

```text
catalogo
  -> adicionar produto ao carrinho
  -> acessar checkout
  -> validar endereco quando houver equipamento
  -> validar cupom
  -> selecionar forma de pagamento
  -> criar pedido
  -> acompanhar pagamento no backend
  -> curso liberado apos webhook paid
```

As formas de pagamento usadas pelo frontend atualmente sao:

```text
credit
debit
pix
```

O backend atualmente espera:

```text
credit_card
debit_card
pix
```

Essa conversao precisa ser feita antes da integracao final do checkout com a
API.

## Persistencia local

O navegador armazena:

- sessao do usuario;
- access token;
- refresh token;
- itens do carrinho.

O carrinho e restaurado automaticamente quando o usuario retorna ao site.

## Testes

O frontend possui testes de componentes para:

- aplicacao;
- landing page;
- catalogo;
- carrinho;
- checkout;
- login;
- conta;
- painel administrativo.

Comando recomendado:

```bash
npm test -- --watch=false
```

## Pontos pendentes

- mover `API_URL` para configuracao de ambiente;
- implementar renovacao automatica usando `/Auth/refresh`;
- chamar `/Auth/logout` antes de limpar a sessao;
- alinhar `credit` e `debit` com `credit_card` e `debit_card`;
- consultar `/Orders/{id}/payment` depois da criacao do pedido;
- criar telas para cursos liberados e progresso;
- adicionar tratamento global para respostas `401`;
- substituir textos de status locais por estados do backend;
- revisar limites de tamanho dos arquivos SCSS no build de producao.

## Compatibilidade com o backend

O frontend usa as rotas atualmente implementadas pelo backend, como:

```text
/api/Auth
/api/Products
/api/Orders
/api/PromoCodes
/api/Students
/api/me
```

O arquivo `backend/openapi.yaml` representa uma versao alvo e possui algumas
rotas diferentes, como `/auth/register`, `/courses` e `/admin/courses`.
Qualquer geracao futura de SDK deve ser feita somente depois de padronizar
esse contrato.
