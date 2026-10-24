import { Injectable, inject, signal } from '@angular/core';
import { HttpBackend, HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, defer, finalize, shareReplay, tap, throwError } from 'rxjs';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  User,
} from '../models/auth.models';
import { API_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionHttp = new HttpClient(inject(HttpBackend));
  private readonly tokenKey = 'medishop_token';
  private readonly refreshTokenKey = 'medishop_refresh_token';
  private readonly userKey = 'medishop_user';
  private generation = 0;
  private refreshing?: Observable<AuthResponse>;
  readonly user = signal<User | null>(this.getStoredUser());

  login(request: LoginRequest): Observable<AuthResponse> {
    return defer(() => {
      const generation = ++this.generation;
      this.refreshing = undefined;
      return this.http.post<AuthResponse>(API_URL + '/Auth/login', request).pipe(
        tap((response) => {
          if (generation === this.generation) this.setSession(response);
        }),
      );
    });
  }
  register(request: RegisterRequest): Observable<{ message: string; userId: number }> {
    return this.http.post<{ message: string; userId: number }>(
      API_URL + '/Auth/cadastrar',
      request,
    );
  }
  updateProfile(request: UpdateProfileRequest): Observable<User> {
    const generation = this.generation;
    return this.http.put<User>(API_URL + '/Auth/perfil', request).pipe(
      tap((user) => {
        if (generation === this.generation) this.setUser(user);
      }),
    );
  }
  logout(): void {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();
    // Snapshot the old token and bypass interceptors: logout must never refresh
    // or accidentally revoke a different account logged in while it is pending.
    this.clearSession();
    if (token)
      this.sessionHttp
        .post(
          API_URL + '/Auth/revoke',
          { refreshToken },
          {
            headers: new HttpHeaders({ Authorization: 'Bearer ' + token }),
          },
        )
        .subscribe({
          error: () => {
            /* Local logout already completed, including offline. */
          },
        });
  }
  clearSession(): void {
    ++this.generation;
    this.refreshing = undefined;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    this.user.set(null);
  }
  get sessionVersion(): number {
    return this.generation;
  }
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }
  refresh(): Observable<AuthResponse> {
    if (this.refreshing) return this.refreshing;
    const token = this.getRefreshToken();
    if (!token) return throwError(() => new Error('Sessão expirada. Entre novamente.'));
    const generation = this.generation;
    const operation = this.sessionHttp
      .post<AuthResponse>(API_URL + '/Auth/refresh', { refreshToken: token })
      .pipe(
        tap((response) => {
          if (generation !== this.generation)
            throw new Error('Sessão substituída durante a renovação.');
          this.setSession(response);
        }),
        catchError((error) => {
          if (
            generation === this.generation &&
            error instanceof HttpErrorResponse &&
            [401, 403].includes(error.status)
          )
            this.clearSession();
          return throwError(() => error);
        }),
        finalize(() => {
          if (this.refreshing === operation) this.refreshing = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.refreshing = operation;
    return operation;
  }
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
  isAdmin(): boolean {
    return this.user()?.role === 'Admin';
  }
  private setSession(response: AuthResponse): void {
    localStorage.setItem(this.tokenKey, response.accessToken);
    localStorage.setItem(this.refreshTokenKey, response.refreshToken);
    this.setUser(response.user);
  }
  private setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.user.set(user);
  }
  private getStoredUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem(this.userKey) ?? 'null') as User | null;
    } catch {
      return null;
    }
  }
}
