# Teste pratico de compra e matricula

Este teste abre o Chrome e utiliza o frontend, a API e o PostgreSQL locais reais.
Nao ha interceptacao de respostas nem mocks. A confirmacao e feita pelo webhook
interno de teste: nao realiza cobranca nem valida o futuro provedor de pagamento.

## Executar

1. Inicie o Docker Desktop e o ambiente local do PIM4API:
   `docker compose up -d` dentro de `D:\Projetos\PIM4API`.
2. No PIM4Front, execute `npm install` se as dependencias ainda nao estiverem instaladas.
3. Execute `npm run test:e2e` e informe email e senha do administrador **local**.
   A senha e solicitada sem aparecer no terminal; nao e gravada no projeto.
4. Abra o relatorio com `npm run test:e2e:report`.

Para acompanhar o navegador visivelmente:

```powershell
npm run test:e2e -- -Headed
```

Por padrao, utiliza Chrome instalado, frontend `http://localhost:4200` e a chave
`Payments__WebhookSecret` do `.env` em `D:\Projetos\PIM4API`.
O frontend precisa encaminhar `/api` a API local correspondente a esse `.env`.

Outras pastas ou portas locais podem ser informadas:

```powershell
.\scripts\Test-LocalEnrollmentFlow.ps1 -FrontendUrl http://localhost:4200 -ApiProjectPath D:\Projetos\PIM4API
```

O script e a configuracao do Playwright rejeitam enderecos externos. Para executar
sem perguntas em automacao, forneca `PIM4_E2E_ADMIN_EMAIL` e
`PIM4_E2E_ADMIN_PASSWORD` como variaveis temporarias do processo, sem registrar
credenciais em arquivos. O script restaura as variaveis que altera ao finalizar.

## O que verifica

- Login real do administrador e criacao de curso e turma pelos formularios.
- Turma futura, com dez vagas, vinculada ao curso criado nesta execucao.
- Cadastro real de um aluno ficticio e busca do curso no catalogo.
- Selecao da turma, carrinho, checkout Pix e pedido com total de R$ 100.
- Pedido pendente sem acesso a nenhuma matricula do aluno novo.
- Webhook com assinatura invalida rejeitado com HTTP 401.
- Confirmacao assinada e repeticao do mesmo evento, mantendo uma unica matricula.
- Uma unica vaga consumida, mesmo com a confirmacao repetida.
- Pedido pago, matricula ativa na area do aluno, detalhes corretos e botao de retorno.
- Ausencia de erros JavaScript durante o fluxo.

O relatorio inclui os IDs dos registros ficticios e uma imagem da area do aluno.
`playwright-report/` e `test-results/` sao locais e ignorados pelo Git.
Traces e videos ficam desligados para evitar registrar sessoes autenticadas.

## Dados de teste e limites

Cada execucao cria um curso com prefixo `TESTE E2E`, uma turma, um aluno
`e2e-aluno-...@example.com`, um pedido e uma matricula de teste no banco local.
O curso e arquivado no bloco de finalizacao, inclusive quando uma verificacao
falha apos sua criacao. Historico de aluno, pedido e matricula permanece para
inspecao; o teste nao apaga registros ou dados existentes.

Nao ha repeticao automatica em caso de falha, evitando criar novas compras sem
perceber. Se o processo for interrompido abruptamente, o curso pode precisar ser
arquivado manualmente pelo nome registrado no relatorio.

Este cenario nao cobre cobranca real, reembolso, cancelamento, compras simultaneas,
aplicativo Android ou desktop. A integracao do provedor exigira testes de sandbox
proprios antes de receber pagamentos reais.
