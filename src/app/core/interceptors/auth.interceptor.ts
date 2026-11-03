import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap, catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_URL } from '../config/api.config';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_URL + '/')) return next(request);
  const auth = inject(AuthService);
  const token = auth.getToken();
  const version = auth.sessionVersion;
  const authorized = token
    ? request.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
    : request;
  const retry = () => {
    const refreshedToken = auth.getToken();
    return next(request.clone({ setHeaders: { Authorization: 'Bearer ' + refreshedToken } })).pipe(
      catchError((error: HttpErrorResponse) => {
        if (
          error.status === 401 &&
          version === auth.sessionVersion &&
          auth.getToken() === refreshedToken
        )
          auth.expireSession();
        return throwError(() => error);
      }),
    );
  };
  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status !== 401 ||
        /\/Auth\/(login|cadastrar|refresh|logout|revoke)$/.test(request.url) ||
        version !== auth.sessionVersion
      )
        return throwError(() => error);
      if (!auth.getRefreshToken()) {
        if (token) auth.expireSession();
        return throwError(() => error);
      }
      // A late 401 for the previous access token can arrive after rotation ended.
      if (auth.getToken() !== token) return retry();
      return auth.refresh().pipe(switchMap(() => retry()));
    }),
  );
};
