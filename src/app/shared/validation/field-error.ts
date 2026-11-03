import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-field-error',
  template: `
    @if (control().invalid && (control().touched || control().dirty)) {
      <small class="field-error" role="status">{{ message() }}</small>
    }
  `,
})
export class FieldError {
  readonly control = input.required<AbstractControl>();

  message(): string {
    const errors = this.control().errors ?? {};
    if (errors['required']) return 'Preencha este campo.';
    if (errors['email']) return 'Informe um e-mail válido.';
    if (errors['cpf']) return 'Informe um CPF válido, com 11 dígitos.';
    if (errors['phone'])
      return 'Informe telefone fixo ou celular com DDD, por exemplo (11) 99999-9999.';
    if (errors['zipCode']) return 'Informe um CEP com 8 dígitos, por exemplo 01001-000.';
    if (errors['state']) return 'Informe uma UF válida, por exemplo SP.';
    if (errors['minlength'])
      return `Use pelo menos ${errors['minlength'].requiredLength} caracteres.`;
    if (errors['maxlength'])
      return `Use no máximo ${errors['maxlength'].requiredLength} caracteres.`;
    if (errors['pattern']) return 'Use letras maiúsculas, minúsculas e números.';
    return 'Revise o valor informado.';
  }
}
