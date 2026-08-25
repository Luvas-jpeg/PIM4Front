import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest, RegisterRequest } from '../../../core/models/auth.models';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mode = signal<AuthMode>('login');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly loginForm = this.formBuilder.group({
    email: this.formBuilder.control('', [Validators.required, Validators.email]),
    senha: this.formBuilder.control('', [Validators.required]),
  });

  readonly registerForm = this.formBuilder.group({
    nome: this.formBuilder.control('', [Validators.required, Validators.minLength(3)]),
    email: this.formBuilder.control('', [Validators.required, Validators.email]),
    senha: this.formBuilder.control('', [Validators.required, Validators.minLength(6)]),
    cpf: this.formBuilder.control('', [Validators.required, Validators.minLength(11)]),
    phone: this.formBuilder.control('', [Validators.required, Validators.minLength(10)]),
  });

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.error.set(null);
    this.success.set(null);
  }

  submitLogin(): void {
    this.error.set(null);
    this.success.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.error.set('Informe email e senha validos.');
      return;
    }

    this.loading.set(true);

    this.authService.login(this.loginForm.getRawValue() as LoginRequest)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.navigateAfterAuth(),
        error: (response) => {
          this.error.set(response.error?.message ?? 'Nao foi possivel entrar.');
        },
      });
  }

  submitRegister(): void {
    this.error.set(null);
    this.success.set(null);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.error.set('Preencha os dados do cadastro corretamente.');
      return;
    }

    const registerRequest = this.registerForm.getRawValue() as RegisterRequest;
    const loginRequest: LoginRequest = {
      email: registerRequest.email,
      senha: registerRequest.senha,
    };

    this.loading.set(true);

    this.authService.register(registerRequest)
      .pipe(
        switchMap(() => this.authService.login(loginRequest)),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => {
          this.success.set('Conta criada com sucesso.');
          this.navigateAfterAuth();
        },
        error: (response) => {
          this.error.set(response.error?.message ?? 'Nao foi possivel criar sua conta.');
        },
      });
  }

  private navigateAfterAuth(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';

    void this.router.navigateByUrl(returnUrl);
  }
}
