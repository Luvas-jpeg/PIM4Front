# Validação do frontend e da API no Render

Este roteiro verifica a aplicação publicada. Os testes automatizados da API continuam no PIM4API e usam bancos isolados; não devem ser apontados ao banco hospedado para homologação.

## 1. Publicar as alterações

Envie as alterações de cada repositório para a branch conectada ao respectivo serviço. Confira a aprovação do workflow **Backend CI** no GitHub: ele compila a API e executa os testes, incluindo concorrência, em PostgreSQL isolado.

No Render, aguarde o deploy de API e frontend e confira os commits publicados. Se o deploy automático estiver desligado, use **Manual Deploy → Deploy latest commit**. A configuração disponível é descrita na [documentação de deploy do Render](https://render.com/docs/deploys#manual-deploys).

O fluxo principal já foi exercitado manualmente pelo responsável no Render. Esta rodada complementa esse teste com dados inválidos, autorização e confirmação de pagamento pelo contrato interno.

## 2. Verificações básicas sem alterar dados

No terminal, na pasta PIM4Front, com Python 3:

```bash
python3 scripts/validate-render-api.py --api-url https://SUA-API.onrender.com
```

Substitua a URL pela raiz do serviço da API, sem `/api`. No Windows, use `py -3` no lugar de `python3`, se necessário.

O script faz somente GET por padrão:

| Consulta                   | Resultado esperado                     |
| -------------------------- | -------------------------------------- |
| `/health/live`             | 200, processo ativo                    |
| `/health`                  | 200, conexão com o banco disponível    |
| `/api/courses/catalog`     | 200, catálogo público em JSON          |
| `/api/Orders/my` sem token | 401                                    |
| `/api/courses` sem token   | 401, listagem administrativa protegida |

Esses resultados não comprovam regras de matrícula, concorrência ou pagamento. Se a instância estiver iniciando, aguarde a disponibilidade e execute novamente. O script não segue redirecionamentos e aceita apenas URLs HTTPS `*.onrender.com`.

## 3. Validar formulários e a API separadamente

No site, teste cadastro, conta e endereço. Cada campo inválido deve receber uma mensagem ao ser alterado ou após tentar enviar o formulário. Dados rejeitados não devem ser salvos.

| Campo    | Casos                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------- |
| Nome     | Vazio, somente espaços, menos de 3 caracteres ou mais de 120                                        |
| E-mail   | Formato inválido; espaços nas extremidades e maiúsculas em endereço válido devem ser normalizados   |
| CPF      | Dígitos verificadores inválidos, sequência repetida, letras; aceitar formato com ou sem pontuação   |
| Telefone | Letras, falta de DDD ou comprimento incorreto; aceitar fixo/celular brasileiro, inclusive com `+55` |
| CEP      | Letras, 7 ou 9 dígitos; aceitar 8 dígitos com ou sem hífen                                          |
| UF       | Rejeitar `ZZ`; aceitar `sp` e persistir `SP`                                                        |
| Senha    | Menos de 12 caracteres ou ausência de maiúscula, minúscula ou número; máximo de 128                 |

A validação de CPF verifica formato e dígitos, não identidade ou situação cadastral. Telefone, CEP e UF têm validação de formato, sem confirmação de existência, titularidade ou correspondência entre endereço e CEP. O número de telefone deve ser brasileiro nesta versão.

Para testar **a API**, use Postman, Insomnia ou outra ferramenta de requisições; o frontend agora bloqueia dados inválidos antes do envio:

1. Faça login com uma conta fictícia por `POST /api/Auth/login`, com JSON contendo `email` e `senha`.
2. Guarde o `accessToken` apenas no ambiente local da ferramenta; não o coloque em arquivos versionados.
3. Consulte `GET /api/Orders/my` com `Authorization: Bearer SEU_TOKEN`: esperado 200.
4. Com token de Cliente, consulte `GET /api/courses`: esperado 403.
5. Envie `PUT /api/Auth/perfil` com os dados válidos completos da conta fictícia, alterando apenas um campo por vez para um valor inválido. Esperado 400; confirme que os dados anteriores continuam salvos.
6. Faça cadastro com e-mail já usado: esperado 409. Login com senha incorreta: esperado 401. Evite muitas tentativas consecutivas, pois o bloqueio e o limite de requisições são intencionais.
7. Com duas contas fictícias, tente consultar o pedido de uma usando o token da outra por `GET /api/Orders/{id}`: esperado 404, sem expor dados.

O perfil da API permite endereço ausente para clientes que ainda não o preencheram. Quando CEP/UF são enviados, precisam ter formato válido. As telas de edição de endereço continuam exigindo os campos essenciais para salvar um endereço completo.

## 4. Confirmar um pagamento fictício pelo fluxo correto

Este procedimento usa o webhook interno atual. Não testa gateway, Pix real, cartão ou movimentação de dinheiro. Altera o pedido e pode criar matrícula; execute somente para dados fictícios identificados na demonstração ou em um ambiente separado de homologação.

### Configuração

No serviço **da API** no Render, em **Environment → Environment Variables**, configure `Payments__WebhookSecret` com um segredo próprio e forte, caso ainda não exista. Não substitua um segredo já utilizado por outro fluxo. Salve com deploy para que o processo receba a variável. O Render documenta essas opções em [Environment Variables and Secrets](https://render.com/docs/configure-environment-variables).

Esse segredo pertence à API. Não o coloque no frontend, no Git ou em mensagens. O script solicita o valor no terminal com entrada oculta e o utiliza somente para gerar a assinatura HMAC localmente.

### Execução

1. Cadastre uma conta fictícia e prepare um curso/turma futura de teste.
2. Anote as vagas disponíveis antes do pedido.
3. Crie um pedido pelo site e anote seu ID. Confira a reserva da vaga e a ausência de matrícula enquanto o pedido estiver pendente.
4. Antes da expiração da reserva (padrão 30 minutos), execute, substituindo URL e ID:

```bash
python3 scripts/validate-render-api.py \
  --api-url https://SUA-API.onrender.com \
  --confirm-payment --order-id 123
```

No Windows, execute em uma linha. O script mostra a API e o pedido e exige que você digite `PAGAR TESTE 123`. Em seguida solicita o segredo com entrada oculta.

O script verifica uma assinatura inválida usando um ID inexistente e exige 401. Depois envia um evento `paid` corretamente assinado e repete **o mesmo evento** para verificar que ambos são aceitos. Não faz novas tentativas automáticas em falhas de rede. Se houver timeout após o envio, confira o estado do pedido no site antes de repetir qualquer operação.

O contrato usa as propriedades `EventId`, `PaymentId`, `OrderId` e `Status`, com essa capitalização. A assinatura do header `X-Webhook-Signature` é o HMAC-SHA256 hexadecimal dos bytes exatos do corpo JSON.

### Conferência após a execução

- O pedido aparece como pago.
- O aluno recebe uma única matrícula na turma correta.
- A repetição do evento não gera outra matrícula nem consome outra vaga.
- A vaga é reservada na criação do pedido; a confirmação não deve descontá-la novamente.
- O administrador pode consultar o evento em `GET /api/payments/webhook-events?orderId=123` com seu token.
- Arquive o curso fictício ao finalizar, preservando o histórico.

Não altere `PaymentStatus` diretamente no banco: isso ignora o processamento de matrícula e eventos. Um pedido já alterado dessa forma não serve para validar o caminho completo; crie um pedido fictício novo.

### Diagnóstico

| Resposta                    | Verificação                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| 503 no webhook              | Segredo ausente na API ou deploy da variável ainda não aplicado                           |
| 401 na confirmação assinada | Segredo diferente do configurado na API                                                   |
| 404                         | ID inexistente ou URL de serviço incorreta                                                |
| 400 após assinatura válida  | Estado do pedido, reserva encerrada ou regra de negócio; confira logs e detalhe do pedido |
| 429                         | Aguarde a janela do limite de requisições                                                 |
| Timeout                     | Verifique disponibilidade e estado do pedido antes de repetir                             |

## 5. O que ainda requer uma rodada própria

O roteiro não executa compras simultâneas contra o banco da demonstração. Os testes de concorrência ficam no Backend CI e no PostgreSQL isolado de desenvolvimento. O gateway futuro precisará de sandbox próprio para testar cobrança, assinatura do provedor, pagamento recusado, expiração e estorno real.

Ao registrar a homologação, anote data, commits publicados, IDs fictícios usados e resultados. Nunca registre tokens, senha ou segredo de webhook.

## 6. Erros e recuperação do checkout

As verificações automatizadas locais cobrem os casos abaixo usando respostas HTTP controladas. Elas não substituem repetir o fluxo após publicar os commits no Render.

| Situação                                     | Comportamento esperado                                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Token expirado e renovação recusada          | Encerrar sessão local, abrir login com aviso e preservar a página de retorno                          |
| Falha de rede ao renovar a sessão            | Manter a sessão para nova tentativa; não repetir automaticamente a criação de pedido                  |
| HTTP 403                                     | Informar falta de permissão, sem encerrar uma sessão válida                                           |
| Login incorreto                              | Informar credenciais inválidas, sem confundir com sessão expirada                                     |
| Cadastro aceito e login automático falha     | Informar que a conta foi criada e permitir entrar manualmente                                         |
| HTTP 429                                     | Orientar aguardar antes de tentar novamente                                                           |
| Falha ao consultar histórico                 | Mostrar erro com opção de nova tentativa, sem dizer que o histórico está vazio                        |
| Falha ao salvar perfil                       | Preservar os campos editados e liberar o botão de salvar                                              |
| Falha ao consultar um pedido                 | Permitir nova tentativa em falha transitória; tratar pedido inexistente ou sem permissão              |
| Falha ao atualizar pedido já carregado       | Manter os dados anteriores com aviso de que a atualização falhou                                      |
| Falha de conexão ou HTTP 5xx no checkout     | Preservar carrinho e orientar conferir “Meus pedidos”, pois o servidor pode ter registrado a operação |
| Nova tentativa do mesmo pedido na mesma tela | Reutilizar a chave de idempotência; se os dados do pedido mudarem, gerar uma nova chave               |
| Clique repetido durante envio                | Enviar apenas uma requisição de criação                                                               |
| Cupom ainda em validação                     | Aguardar a consulta antes de criar o pedido                                                           |
| Pedido criado                                | Abrir `/conta/pedido/ID`, exibir “Aguardando pagamento” e limpar o carrinho                           |
| Confirmação aceita pelo webhook              | Ao clicar “Atualizar situação”, mostrar pagamento confirmado e acesso à área do aluno                 |

### Exercitar manualmente no navegador

Use contas e pedidos fictícios. Abra primeiro a aplicação com conexão disponível.

1. Para verificar a perda de conexão, ative **Offline** nas ferramentas de desenvolvimento do navegador. Tente aplicar um cupom ou consultar um pedido. Confira a mensagem de conexão e os dados preservados; reative a rede e tente novamente.
2. Para verificar a sessão encerrada, na sessão de uma conta fictícia, remova a chave `medishop_refresh_token` do Local Storage e substitua `medishop_token` por um texto inválido. Abra “Minha conta”: a API deve recusar o token e o site deve encaminhar para login, com aviso de sessão expirada. Ao entrar novamente, deve voltar à página solicitada.
3. Faça um pedido fictício normalmente e confira que a tela abre seus detalhes, sem conceder matrícula enquanto pendente. Se a criação falhar por conexão, consulte “Meus pedidos” antes de repetir; a reutilização da chave descrita acima vale para o mesmo pedido na mesma instância da tela, não após recarregar o navegador.
4. Use a simulação assinada da seção 4 e clique **Atualizar situação** nos detalhes do pedido. Confira pagamento confirmado e uma única matrícula.

Os casos de concorrência de sessão, resposta HTTP 5xx e falha após cadastro estão cobertos nos testes locais; não é necessário interromper a API hospedada para provocá-los. No Render, acompanhe as respostas na aba de rede e os logs para distinguir problemas de publicação de erros esperados de negócio.
