import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { AuthResponse } from '../models/auth.models';

describe('Auth session concurrency', () => {
  let auth: AuthService, http: HttpClient, mock: HttpTestingController;
  const response: AuthResponse = {
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
    expiresIn: 3600,
    user: {
      id: 1,
      nome: 'Aluno',
      email: 'aluno@example.com',
      cpf: '',
      phone: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      role: 'Cliente',
    },
  };
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('medishop_token', 'old-access');
    localStorage.setItem('medishop_refresh_token', 'old-refresh');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpClient);
    mock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    mock.verify();
    localStorage.clear();
  });
  it('shares a single refresh across simultaneous 401 and keeps session on a failed retry', () => {
    const errors: number[] = [];
    http.get('/api/me').subscribe();
    http.get('/api/Orders/my').subscribe({ error: (e) => errors.push(e.status) });
    mock.expectOne('/api/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    mock.expectOne('/api/Orders/my').flush({}, { status: 401, statusText: 'Unauthorized' });
    mock.expectOne('/api/Auth/refresh').flush(response);
    const me = mock.expectOne('/api/me');
    expect(me.request.headers.get('Authorization')).toBe('Bearer new-access');
    me.flush({});
    mock.expectOne('/api/Orders/my').flush({}, { status: 500, statusText: 'Error' });
    expect(errors).toEqual([500]);
    expect(auth.getToken()).toBe('new-access');
  });
  it('does not rotate twice when a late 401 arrives after refresh finished', () => {
    http.get('/api/me').subscribe();
    http.get('/api/Orders/my').subscribe();
    const late = mock.expectOne('/api/Orders/my');
    mock.expectOne('/api/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    mock.expectOne('/api/Auth/refresh').flush(response);
    mock.expectOne('/api/me').flush({});
    late.flush({}, { status: 401, statusText: 'Unauthorized' });
    mock.expectNone('/api/Auth/refresh');
    mock.expectOne('/api/Orders/my').flush({});
  });
  it('revokes on logout and ignores a refresh completed after logout', () => {
    auth.refresh().subscribe({ error: () => {} });
    const pending = mock.expectOne('/api/Auth/refresh');
    auth.logout();
    const logout = mock.expectOne('/api/Auth/revoke');
    expect(logout.request.headers.get('Authorization')).toBe('Bearer old-access');
    logout.flush({}, { status: 503, statusText: 'Offline' });
    pending.flush(response);
    expect(auth.getToken()).toBeNull();
    expect(auth.user()).toBeNull();
  });
  it('never retries an old account request using a new account session', () => {
    let failed = false;
    http.get('/api/me').subscribe({ error: () => (failed = true) });
    const old = mock.expectOne('/api/me');
    auth.login({ email: 'outro@example.com', senha: 'Senha' }).subscribe();
    mock.expectOne('/api/Auth/login').flush(response);
    old.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(failed).toBe(true);
    mock.expectNone('/api/Auth/refresh');
  });
});
