import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VLibrasService {
  private readonly document = inject(DOCUMENT);
  private pending?: Promise<void>;
  private loaded = false;

  load(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.pending) return this.pending;
    this.pending = new Promise<void>((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
      script.async = true;
      const timeout = setTimeout(() => finish(false), 15000);
      const finish = (success: boolean) => {
        clearTimeout(timeout);
        script.onload = null;
        script.onerror = null;
        this.pending = undefined;
        if (success) {
          this.loaded = true;
          resolve();
        } else {
          script.remove();
          reject(new Error('Não foi possível carregar o VLibras. Tente novamente.'));
        }
      };
      script.onload = () => finish(true);
      script.onerror = () => finish(false);
      // The current official widget initializes itself after script loading.
      this.document.body.appendChild(script);
    });
    return this.pending;
  }
}
