import { HttpErrorResponse } from '@angular/common/http';

/** Translate transport failures without exposing server or proxy diagnostics. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0)
    return 'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.';
  if (error.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
  if (error.status === 403) return 'Você não tem permissão para realizar esta ação.';
  if (error.status === 429)
    return 'Muitas tentativas em pouco tempo. Aguarde um momento e tente novamente.';
  if (error.status >= 500)
    return 'O serviço está temporariamente indisponível. Tente novamente em instantes.';
  const message = error.error?.message;
  if (typeof message === 'string' && message.trim()) return message;
  const errors = error.error?.errors;
  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const messages = Object.values(errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === 'string' && !!value.trim());
    if (messages.length) return [...new Set(messages)].join(' ');
  }
  return fallback;
}
