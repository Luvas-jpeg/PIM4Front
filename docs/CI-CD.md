# CI/CD do PIM4Front e PIM4API

Os repositórios têm pipelines independentes. O GitHub valida cada commit; o Render deve publicar apenas depois dos checks aprovados. As alterações de configuração precisam ser enviadas aos respectivos repositórios para entrar em funcionamento.

## Verificações do frontend

O workflow `Frontend CI` executa em pull requests para `main`, pushes em `main`, manualmente e semanalmente:

- `Frontend quality`: Node 24, instalação pelo lockfile, formatação, testes com JUnit, build de produção e auditoria npm. Vulnerabilidades altas ou críticas impedem aprovação; as demais continuam visíveis no relatório.
- `Frontend container`: build do Dockerfile com cache, sem publicar imagens, e teste da imagem em execução. Confere a entrada Angular, o fallback de uma rota interna e o encaminhamento de `/api` a um servidor descartável de teste.
- `Frontend CI gate`: falha se qualquer uma das etapas anteriores falhar, for cancelada ou pulada.

Os artefatos `frontend-reports` e `frontend-dist` ficam disponíveis na execução do GitHub por sete dias. O JUnit e a auditoria são anexados mesmo quando uma etapa posterior falha, desde que os arquivos tenham sido gerados.

O script `npm run test:ci` é a mesma suíte funcional, com saída JUnit em `test-results/unit-tests.xml`. Para uso local, prefira Node 24, registrado em `.nvmrc`.

## Verificações da API

O workflow `Backend CI`, no PIM4API, usa .NET 10 e PostgreSQL 17 descartável:

- `Backend quality`: restore com auditoria de dependências diretas e transitivas, compilação, testes incluindo concorrência, conferência do TRX, cobertura e publicação da aplicação como artefato.
- A auditoria rejeita vulnerabilidades altas/críticas e falhas na consulta das informações de segurança. Listar pacotes vulneráveis, sozinho, não era um bloqueio suficiente na pipeline anterior.
- A conferência do TRX exige testes executados e aprovados, sem pulos, e a presença dos seis testes de `PostgreSqlConcurrencyTests`. Assim, esquecer `PIM4_POSTGRES_TESTS=1` não produz uma aprovação parcial.
- `Backend container`: constrói o Dockerfile real, inicia a API contra outro banco descartável, aplica migrations e consulta saúde e catálogo. Isso complementa os testes de serviço que criam o schema diretamente.
- `Backend CI gate`: exige a aprovação dos dois jobs anteriores.

Os artefatos `backend-reports` (TRX e cobertura) e `backend-publish` ficam disponíveis por sete dias. A cobertura é registrada sem impor um percentual arbitrário de aprovação.

Os dados e credenciais de PostgreSQL declarados na pipeline são exclusivos do runner descartável. Não configure conexão de produção nos jobs. O teste de container da API espera PostgreSQL no runner Linux, na porta 5432; o script não é um comando de homologação para o Render.

## Segurança e manutenção

As Actions estão fixadas por SHA, com a família da versão em comentário, e o checkout não mantém credenciais no diretório de trabalho. Workflows têm permissões mínimas, limite de duração e cancelam execuções antigas da mesma referência.

O CodeQL verifica o código da aplicação e os workflows (`actions`), com execução semanal e manual. Seu funcionamento depende do Code scanning habilitado e disponível para o repositório. A execução do analisador e a resolução dos alertas são verificações diferentes: revise também os resultados em Security, conforme as regras do repositório.

Dependabot está configurado para propor atualizações semanais de npm/NuGet e GitHub Actions. Atualizações menores e patches são agrupados; não há merge automático.

Os workflows não fazem checkout cruzado dos repositórios, não usam credenciais do Render e não publicam imagens em um registry. O E2E completo de compra/matrícula continua no [roteiro existente](../e2e/README.md), com infraestrutura local. Os testes de container não são uma execução desse E2E.

## Ativar o bloqueio de merge no GitHub

Depois de publicar os arquivos e concluir a primeira execução de cada pipeline, configure uma regra para `main` em cada repositório:

1. Exigir pull request antes do merge.
2. Exigir os checks `Frontend CI gate` no PIM4Front e `Backend CI gate` no PIM4API.
3. Selecionar os checks CodeQL efetivamente exibidos no repositório, se forem obrigatórios na equipe.
4. Exigir que a branch esteja atualizada antes do merge, conforme o fluxo adotado.

Essas regras são configurações da conta/repositório, não são ativadas apenas pelo YAML. Se existirem checks antigos obrigatórios, atualize os nomes para não deixar pull requests aguardando um job removido.

## Ativar o deploy após CI no Render

Os dois `render.yaml` declaram `autoDeployTrigger: checksPass`. Para serviços já criados manualmente, confirme em cada serviço: **Settings → Auto-Deploy → After CI Checks Pass**. Se o serviço for gerenciado por Blueprint, sincronize o Blueprint e confira o resultado no painel.

O Render considera os checks do commit da branch conectada ao serviço. Confira a integração GitHub, a branch e o commit do deploy. Um arquivo alterado localmente não muda o serviço hospedado. O deploy manual pode contornar a espera pelo CI; use-o conscientemente, após conferir os resultados.

Os artefatos do GitHub são evidências e builds para inspeção. Com a configuração atual, o Render reconstrói o Dockerfile do commit aprovado; ele não baixa automaticamente esses artefatos. API e frontend também não são publicados de forma atômica: mantenha compatibilidade entre versões durante mudanças de contrato.

Não é necessário cadastrar um deploy hook secreto no GitHub para esse fluxo.

## Conferir e recuperar uma publicação

Depois do deploy, verifique `/health/live`, `/health` e catálogo na API, o acesso à página inicial e a abertura direta de uma rota Angular no frontend. Use o [roteiro de validação no Render](VALIDACAO-RENDER.md) para autorização, checkout e confirmação fictícia de pagamento.

Não há requisições automáticas ao Render nos workflows entregues. As verificações de container executam somente no runner de CI.

Se uma versão apresentar problema, identifique o commit e consulte os logs. Para rollback, selecione um deploy anterior no painel e confira a configuração de auto-deploy depois da operação. Voltar o código não desfaz migrations do banco; alterações de schema exigem backup e um plano compatível de recuperação.

## Estado da validação desta alteração

- Workflows verificados localmente com `actionlint`; arquivos YAML e referências fixadas das Actions conferidos.
- Comando de testes do frontend executado, com 113 testes no relatório JUnit e nenhuma falha.
- Auditoria npm consultada: nenhuma vulnerabilidade alta/crítica; 16 moderadas na consulta desta etapa. A auditoria é repetida pela pipeline e pode mudar.
- Verificador de TRX exercitado com resultados completos, vazios, pulados e sem a suíte PostgreSQL.
- Os jobs Docker, os testes .NET e o CodeQL remoto precisam da primeira execução no GitHub: Docker e SDK .NET não estão disponíveis neste computador.
- Regras de merge e configurações dos serviços existentes no Render precisam ser conferidas no painel; não foram alteradas nesta sessão.

## Referências

- [Render: deploy após aprovação do CI](https://render.com/docs/deploys#integrating-with-ci).
- [Render: autoDeployTrigger nos Blueprints](https://render.com/docs/blueprint-spec#autodeploytrigger).
- [NuGet: auditoria de pacotes](https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages).
- [GitHub: proteção de branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
