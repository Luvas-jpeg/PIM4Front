import { Component, inject, signal } from '@angular/core';
import { VLibrasService } from '../../core/services/vlibras.service';

@Component({
  selector: 'app-accessibility',
  template: `
    <div class="accessibility">
      <button
        type="button"
        class="navigation-button accessibility__button"
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
      <p class="accessibility__message" role="status" aria-live="polite">{{ message() }}</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .accessibility {
      display: grid;
      gap: 8px;
      min-width: 0;
    }
    .accessibility__button {
      justify-self: start;
      max-width: 100%;
      min-height: 44px;
      padding: 10px 14px;
      line-height: 1.4;
      text-align: left;
      white-space: normal;
    }
    .accessibility__message {
      margin: 0;
      font-size: 0.8rem;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
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
