import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const authorizedRequest = token
    ? request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      const isRefreshRequest = request.url.endsWith('/Auth/refresh');
      const canRefresh = error.status === 401
        && !isRefreshRequest
        && !!authService.getRefreshToken();

      if (!canRefresh) {
        return throwError(() => error);
      }

      return authService.refresh().pipe(
        switchMap(() => next(request.clone({
          setHeaders: {
            Authorization: `Bearer ${authService.getToken()}`,
          },
        }))),
        catchError(refreshError => {
          authService.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};