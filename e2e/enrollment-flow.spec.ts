import { test, expect, type APIRequestContext, type Locator } from '@playwright/test';
import { createHmac, randomBytes, randomInt } from 'node:crypto';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Execute npm run test:e2e para configurar as credenciais locais.');
  return value;
}

function testCpf(): string {
  const digits = Array.from({ length: 9 }, () => randomInt(0, 10));
  for (const size of [9, 10]) {
    const remainder = digits.reduce((sum, digit, i) => sum + digit * (size + 1 - i), 0) * 10 % 11;
    digits.push(remainder === 10 ? 0 : remainder);
  }
  return digits.join('');
}

function responseAt(path: string, method = 'GET') {
  return (response: { url(): string; request(): { method(): string } }) =>
    new URL(response.url()).pathname.toLowerCase() === path.toLowerCase() && response.request().method() === method;
}

// Playwright registra o argumento de fill no titulo da acao no relatorio.
// Evaluate envia o evento real do formulario sem incluir a senha nesse titulo.
async function fillPassword(field: Locator, password: string): Promise<void> {
  await field.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, password);
}

test('curso e turma -> pedido pendente -> pagamento local -> matricula do aluno', async ({ page, browser, request }, info) => {
  const adminEmail = required('PIM4_E2E_ADMIN_EMAIL');
  const adminPassword = required('PIM4_E2E_ADMIN_PASSWORD');
  const secret = required('PIM4_E2E_WEBHOOK_SECRET');
  const run = `${Date.now()}-${randomBytes(3).toString('hex')}`;
  const courseName = `TESTE E2E - Curso ${run}`;
  const studentEmail = `e2e-aluno-${run}@example.com`;
  const studentPassword = `TesteE2e${randomBytes(12).toString('hex')}9`;
  const studentContext = await browser.newContext({ baseURL: info.project.use.baseURL });
  const studentPage = await studentContext.newPage();
  let courseId = 0;
  let classId = 0;
  let orderId = 0;
  let enrollmentId = 0;
  let adminToken = '';
  let studentToken = '';
  let failed = false;
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  studentPage.on('pageerror', error => browserErrors.push(error.message));
  const headers = () => ({ Authorization: `Bearer ${adminToken}` });
  const mine = async (client: APIRequestContext) => {
    const response = await client.get('/api/me/courses', { headers: { Authorization: `Bearer ${studentToken}` } });
    expect(response.status(), 'Consulta real das matriculas').toBe(200);
    return await response.json() as Array<{ enrollmentId: number; courseId: number; classId: number; orderId: number; enrollmentStatus: string }>;
  };

  try {
    await test.step('Administrador entra e cria curso pelo formulario real', async () => {
      await page.goto('/login?returnUrl=/admin');
      await page.locator('input[formcontrolname="email"]').fill(adminEmail);
      await fillPassword(page.locator('input[formcontrolname="senha"]'), adminPassword);
      const login = page.waitForResponse(responseAt('/api/Auth/login', 'POST'));
      await page.getByRole('button', { name: 'Entrar', exact: true }).click();
      const response = await login;
      expect(response.status(), 'Login do administrador local').toBe(200);
      const auth = await response.json();
      expect(auth.user.role).toBe('Admin');
      adminToken = auth.accessToken;
      await expect(page).toHaveURL(/\/admin$/);
      await page.getByRole('button', { name: 'Cursos', exact: true }).click();
      await page.getByRole('button', { name: 'Adicionar curso', exact: true }).click();
      const form = page.locator('.creation-form--open');
      await form.locator('[formcontrolname="nome"]').fill(courseName);
      await form.locator('[formcontrolname="preco"]').fill('100');
      await form.locator('[formcontrolname="workloadHours"]').fill('8');
      await form.locator('[formcontrolname="category"]').fill('Teste automatizado');
      await form.locator('[formcontrolname="description"]').fill('Dados ficticios de verificacao local.');
      const create = page.waitForResponse(responseAt('/api/courses', 'POST'));
      await form.getByRole('button', { name: 'Salvar curso', exact: true }).click();
      const created = await create;
      expect(created.ok(), 'Cadastro real do curso').toBeTruthy();
      courseId = (await created.json()).id;
      expect(courseId).toBeGreaterThan(0);
      await expect(form).toHaveCount(0);
    });

    await test.step('Administrador cria turma futura com dez vagas', async () => {
      await page.getByRole('button', { name: 'Turmas', exact: true }).click();
      const group = page.locator('.class-course-group').filter({ has: page.getByRole('heading', { name: courseName, exact: true }) });
      await group.getByRole('button', { name: 'Adicionar turma', exact: true }).click();
      const form = page.locator('.creation-form--open');
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      future.setHours(14, 0, 0, 0);
      const localDate = new Date(future.getTime() - future.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
      await form.locator('[formcontrolname="startDate"]').fill(localDate);
      await form.locator('[formcontrolname="local"]').fill('Sala de teste E2E');
      await form.locator('[formcontrolname="instructor"]').fill('Instrutor ficticio');
      await form.locator('[formcontrolname="capacity"]').fill('10');
      const create = page.waitForResponse(responseAt(`/api/courses/${courseId}/classes`, 'POST'));
      await form.getByRole('button', { name: 'Salvar turma', exact: true }).click();
      const created = await create;
      expect(created.ok(), 'Cadastro real da turma').toBeTruthy();
      classId = (await created.json()).id;
      expect(classId).toBeGreaterThan(0);
      await expect(form).toHaveCount(0);
      await expect(group.locator('.class-card')).toHaveCount(1);
    });

    await test.step('Aluno se cadastra e encontra o curso no catalogo', async () => {
      await studentPage.goto('/login?returnUrl=/catalogo');
      await studentPage.getByRole('button', { name: 'Cadastro', exact: true }).click();
      await studentPage.locator('[formcontrolname="nome"]').fill('Aluno Teste E2E');
      await studentPage.locator('[formcontrolname="email"]').fill(studentEmail);
      await fillPassword(studentPage.locator('[formcontrolname="senha"]'), studentPassword);
      await studentPage.locator('[formcontrolname="cpf"]').fill(testCpf());
      await studentPage.locator('[formcontrolname="phone"]').fill('11999999999');
      const login = studentPage.waitForResponse(responseAt('/api/Auth/login', 'POST'));
      await studentPage.getByRole('button', { name: 'Criar conta', exact: true }).click();
      const authenticated = await login;
      expect(authenticated.status(), 'Cadastro e login reais do aluno').toBe(200);
      studentToken = (await authenticated.json()).accessToken;
      await expect(studentPage).toHaveURL(/\/catalogo$/);
      await studentPage.locator('.catalog__search input').fill(courseName);
      const card = studentPage.locator('.product-card').filter({ has: studentPage.getByRole('link', { name: courseName, exact: true }) });
      await expect(card).toHaveCount(1);
      await card.getByRole('link', { name: 'Ver detalhes', exact: true }).click();
      await expect(studentPage).toHaveURL(new RegExp(`/curso/${courseId}$`));
      await expect(studentPage.locator('.class-selector select')).toHaveValue(String(classId));
      await expect(studentPage.getByRole('button', { name: 'Inscrever-se agora', exact: true })).toBeEnabled();
    });

    await test.step('Aluno compra pelo carrinho e checkout; pedido fica pendente', async () => {
      await studentPage.getByRole('button', { name: 'Inscrever-se agora', exact: true }).click();
      await expect(studentPage).toHaveURL(/\/carrinho$/);
      await expect(studentPage.locator('.cart-item')).toHaveCount(1);
      await studentPage.getByRole('link', { name: 'Finalizar pedido', exact: true }).click();
      await studentPage.locator('input[value="pix"]').check();
      const create = studentPage.waitForResponse(responseAt('/api/Orders', 'POST'));
      await studentPage.getByRole('button', { name: 'Criar pedido', exact: true }).click();
      const created = await create;
      expect(created.ok(), 'Criacao real do pedido').toBeTruthy();
      const order = await created.json();
      orderId = order.orderId;
      expect(orderId).toBeGreaterThan(0);
      expect(order.total).toBe(100);
      await expect(studentPage).toHaveURL(/\/$/);
      await studentPage.goto(`/conta/pedido/${orderId}`);
      await expect(studentPage.locator('.order-statuses strong')).toHaveText('Pagamento: Pendente');
      await studentPage.goto('/area-aluno');
      await expect(studentPage.locator('.courses-panel')).toBeVisible();
      expect(await mine(request), 'Pedido pendente nao libera matricula').toHaveLength(0);
      await expect(studentPage.locator('.course-card')).toHaveCount(0);
    });

    await test.step('Webhook exige assinatura e confirmacao repetida nao duplica matricula', async () => {
      const body = JSON.stringify({ EventId: `e2e-paid-${run}`, OrderId: orderId, PaymentId: `e2e-payment-${run}`, Status: 'paid' });
      const invalid = await request.post('/api/payments/webhook', {
        data: body, headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': 'sha256=invalid' },
      });
      expect(invalid.status(), 'Assinatura invalida rejeitada').toBe(401);
      expect(await mine(request), 'Webhook invalido nao libera acesso').toHaveLength(0);
      const signature = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
      for (let attempt = 0; attempt < 2; attempt++) {
        const paid = await request.post('/api/payments/webhook', {
          data: body, headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': `sha256=${signature}` },
        });
        expect(paid.status(), 'Confirmacao local e repeticao do mesmo evento').toBe(200);
      }
      const enrollments = await mine(request);
      expect(enrollments).toHaveLength(1);
      expect(enrollments[0]).toMatchObject({ courseId, classId, orderId, enrollmentStatus: 'active' });
      enrollmentId = enrollments[0].enrollmentId;
      const course = await request.get(`/api/courses/${courseId}`);
      expect(course.status()).toBe(200);
      const classes = (await course.json()).classes;
      expect(classes.find((item: { id: number }) => item.id === classId).availableSeats, 'Apenas uma vaga consumida').toBe(9);
    });

    await test.step('Aluno ve pagamento e abre a matricula vinculada a turma correta', async () => {
      await studentPage.goto(`/conta/pedido/${orderId}`);
      await expect(studentPage.locator('.order-statuses strong')).toHaveText('Pagamento: Pago');
      await studentPage.goto('/area-aluno');
      const card = studentPage.locator('.course-card').filter({ has: studentPage.getByRole('heading', { name: courseName, exact: true }) });
      await expect(card).toHaveCount(1);
      await expect(card.locator('.badge')).toHaveText('Ativa');
      await info.attach('matricula-na-area-do-aluno', { body: await studentPage.screenshot(), contentType: 'image/png' });
      await card.locator(`a[href="/area-aluno/matricula/${enrollmentId}"]`).click();
      await expect(studentPage).toHaveURL(new RegExp(`/area-aluno/matricula/${enrollmentId}$`));
      await expect(studentPage.locator('.enrollment-header h2')).toHaveText(courseName);
      await expect(studentPage.locator('.enrollment-data')).toContainText('Sala de teste E2E');
      await expect(studentPage.locator('.enrollment-data')).toContainText('Instrutor ficticio');
      await studentPage.getByRole('link', { name: 'Voltar para meus cursos', exact: true }).click();
      await expect(studentPage).toHaveURL(/\/area-aluno$/);
      expect(browserErrors, 'Sem erros JavaScript durante o fluxo').toEqual([]);
      await info.attach('resultado', {
        body: Buffer.from(JSON.stringify({ courseId, classId, orderId, enrollmentId, courseName, studentEmail }, null, 2)),
        contentType: 'application/json',
      });
    });
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      if (courseId && adminToken) {
        await test.step('Arquivar somente o curso ficticio criado nesta execucao', async () => {
          const cleanup = await request.post(`/api/courses/${courseId}/archive`, { headers: headers(), data: {} });
          expect(cleanup.ok(), 'Arquivamento do curso de teste').toBeTruthy();
        });
      }
    } catch (error) {
      if (!failed) throw error;
      info.annotations.push({ type: 'limpeza', description: `Curso de teste ${courseId} nao foi arquivado. Verifique manualmente.` });
    } finally {
      for (const token of [adminToken, studentToken].filter(Boolean)) {
        await request.post('/api/Auth/logout', { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      }
      await studentContext.close();
    }
  }
});
