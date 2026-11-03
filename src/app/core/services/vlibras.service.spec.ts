import { TestBed } from '@angular/core/testing';
import { VLibrasService } from './vlibras.service';

describe('VLibras loading', () => {
  afterEach(() => {
    document
      .querySelectorAll('script[src="https://vlibras.gov.br/app/vlibras-plugin.js"]')
      .forEach((script) => script.remove());
  });

  it('loads only after activation and shares concurrent loading', async () => {
    const service = TestBed.inject(VLibrasService);
    expect(document.querySelector('script[src*="vlibras-plugin"]')).toBeNull();
    const first = service.load();
    expect(service.load()).toBe(first);
    const script = document.querySelector('script[src*="vlibras-plugin"]')!;
    script.dispatchEvent(new Event('load'));
    await first;
    await service.load();
    expect(document.querySelectorAll('script[src*="vlibras-plugin"]')).toHaveLength(1);
  });

  it('allows a new attempt after a network error', async () => {
    const service = TestBed.inject(VLibrasService);
    const first = service.load();
    const failed = expect(first).rejects.toThrow('Não foi possível carregar');
    document.querySelector('script[src*="vlibras-plugin"]')!.dispatchEvent(new Event('error'));
    await failed;
    const retry = service.load();
    document.querySelector('script[src*="vlibras-plugin"]')!.dispatchEvent(new Event('load'));
    await retry;
  });
});
