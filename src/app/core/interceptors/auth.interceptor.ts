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
  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status !== 401 ||
        /\/Auth\/(login|cadastrar|refresh|logout)$/.test(request.url) ||
        version !== auth.sessionVersion ||
        !auth.getRefreshToken()
      )
        return throwError(() => error);
      // A late 401 for the previous access token can arrive after rotation ended.
      if (auth.getToken() !== token)
        return next(request.clone({ setHeaders: { Authorization: 'Bearer ' + auth.getToken() } }));
      return auth.refresh().pipe(
        switchMap(() =>
          next(
            request.clone({
              setHeaders: { Authorization: 'Bearer ' + auth.getToken() },
            }),
          ),
        ),
      );
    }),
  );
};
