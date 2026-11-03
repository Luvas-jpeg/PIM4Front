import { TestBed } from '@angular/core/testing';
import { VLibrasService } from '../../core/services/vlibras.service';
import { Accessibility } from './accessibility';

describe('Accessibility controls', () => {
  it('offers retry and explains failure without blocking the page', async () => {
    const service = {
      load: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      imports: [Accessibility],
      providers: [{ provide: VLibrasService, useValue: service }],
    });
    const fixture = TestBed.createComponent(Accessibility);
    const component = fixture.componentInstance;
    expect(service.load).not.toHaveBeenCalled();
    await component.activate();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Verifique a conexão');
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(false);
    await component.activate();
    expect(component.loaded()).toBe(true);
  });
});
