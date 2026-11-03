import { Component, inject, signal } from '@angular/core';
import { VLibrasService } from '../../core/services/vlibras.service';

@Component({
  selector: 'app-accessibility',
  template: `
    <div>
      <button
        type="button"
        class="navigation-button"
        [disabled]="loading() || loaded()"
        (click)="activate()"
      >
        {{
          loading()
            ? 'Carregando VLibras...'
            : loaded()
              ? 'VLibras carregado'
              : 'Ativar tradução em Libras'
        }}
      </button>
      <p role="status" aria-live="polite">{{ message() }}</p>
    </div>
  `,
})
export class Accessibility {
  private readonly vlibras = inject(VLibrasService);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly message = signal('A tradução em Libras utiliza o serviço externo VLibras.');

  async activate(): Promise<void> {
    if (this.loading() || this.loaded()) return;
    this.loading.set(true);
    try {
      await this.vlibras.load();
      this.loaded.set(true);
      this.message.set('Use o botão do VLibras que aparece na página para iniciar a tradução.');
    } catch {
      this.message.set(
        'Não foi possível carregar o VLibras. Verifique a conexão e tente novamente.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
