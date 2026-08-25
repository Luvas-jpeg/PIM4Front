import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { UpdateProfileRequest } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-account',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class Account {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly form = this.formBuilder.group({
    nome: this.formBuilder.control('', [Validators.required]),
    email: this.formBuilder.control('', [Validators.required, Validators.email]),
    cpf: this.formBuilder.control('', [Validators.required, Validators.minLength(11)]),
    phone: this.formBuilder.control('', [Validators.required]),
    street: this.formBuilder.control('', [Validators.required]),
    number: this.formBuilder.control('', [Validators.required]),
    complement: this.formBuilder.control(''),
    neighborhood: this.formBuilder.control('', [Validators.required]),
    city: this.formBuilder.control('', [Validators.required]),
    state: this.formBuilder.control('', [Validators.required, Validators.minLength(2)]),
    zipCode: this.formBuilder.control('', [Validators.required, Validators.minLength(8)]),
  });

  constructor() {
    this.fillForm();
  }

  save(): void {
    this.error.set(null);
    this.success.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise seus dados e endereco.');
      return;
    }

    this.saving.set(true);

    this.authService.updateProfile(this.normalizeRequest())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.success.set('Dados atualizados com sucesso.'),
        error: response => this.error.set(response.error?.message ?? 'Nao foi possivel atualizar sua conta.'),
      });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/']);
  }

  private fillForm(): void {
    const user = this.user();

    if (!user) {
      return;
    }

    this.form.setValue({
      nome: user.nome ?? '',
      email: user.email ?? '',
      cpf: user.cpf ?? '',
      phone: user.phone ?? '',
      street: user.street ?? '',
      number: user.number ?? '',
      complement: user.complement ?? '',
      neighborhood: user.neighborhood ?? '',
      city: user.city ?? '',
      state: user.state ?? '',
      zipCode: user.zipCode ?? '',
    });
  }

  private normalizeRequest(): UpdateProfileRequest {
    const raw = this.form.getRawValue();

    return {
      ...raw,
      cpf: raw.cpf.replace(/\D/g, ''),
      state: raw.state.trim().toUpperCase(),
      zipCode: raw.zipCode.replace(/\D/g, ''),
    };
  }
}
