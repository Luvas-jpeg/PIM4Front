import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './api-error';

describe('API error messages', () => {
  it.each([
    [0, 'conexão'],
    [401, 'sessão expirou'],
    [403, 'permissão'],
    [429, 'Aguarde'],
    [503, 'temporariamente indisponível'],
  ])('explains HTTP %s without exposing diagnostic details', (status, message) => {
    const error = new HttpErrorResponse({
      status: Number(status),
      error: { message: 'internal stack trace' },
    });
    expect(apiErrorMessage(error, 'Falha.')).toContain(message);
    expect(apiErrorMessage(error, 'Falha.')).not.toContain('stack trace');
  });

  it('preserves validation messages and falls back on non-JSON errors', () => {
    expect(
      apiErrorMessage(
        new HttpErrorResponse({ status: 400, error: { message: 'Turma sem vagas.' } }),
        'Falha.',
      ),
    ).toBe('Turma sem vagas.');
    expect(
      apiErrorMessage(
        new HttpErrorResponse({ status: 400, error: '<html>proxy</html>' }),
        'Falha.',
      ),
    ).toBe('Falha.');
    expect(apiErrorMessage(new Error('internal'), 'Falha.')).toBe('Falha.');
  });
});
