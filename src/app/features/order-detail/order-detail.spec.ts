import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { Order } from '../../core/models/order.models';
import { OrderService } from '../../core/services/order.service';
import { OrderDetail } from './order-detail';

describe('Order details and recovery', () => {
  let fixture: ComponentFixture<OrderDetail>;
  let orderId: string;
  const service = { getById: vi.fn() };
  const order: Order = {
    id: 10,
    dataPedido: '2026-11-03T12:00:00Z',
    status: 'pending',
    paymentStatus: 'pending',
    total: 120,
    valorFrete: 0,
    paymentMethod: 'pix',
    promoCode: '',
    itens: [
      {
        courseId: 1,
        nome: 'Curso teste',
        itemType: 'course',
        turmaId: 7,
        quantidade: 1,
        precoUnitario: 120,
      },
    ],
  };

  beforeEach(async () => {
    registerLocaleData(pt);
    orderId = '10';
    service.getById.mockReset().mockReturnValue(of(order));
    await TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideRouter([]),
        { provide: OrderService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => orderId } } },
        },
      ],
    }).compileComponents();
  });

  function render(): OrderDetail {
    fixture = TestBed.createComponent(OrderDetail);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('shows that a created order awaits confirmation instead of granting access', () => {
    render();
    expect(fixture.nativeElement.textContent).toContain('Aguardando pagamento');
    expect(fixture.nativeElement.textContent).toContain('matrícula será liberada após');
    expect(fixture.nativeElement.querySelector('a[href="/area-aluno"]')).toBeNull();
  });

  it('allows a manual refresh and shows access after confirmation', () => {
    const component = render();
    service.getById.mockReturnValue(of({ ...order, paymentStatus: 'paid' }));
    component.reload();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Pagamento confirmado');
    expect(fixture.nativeElement.querySelector('a[href="/area-aluno"]')).not.toBeNull();
  });

  it('offers retry after a connection failure and loads the order on recovery', () => {
    service.getById.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    const component = render();
    expect(component.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Tentar novamente');
    component.reload();
    fixture.detectChanges();
    expect(component.error()).toBeNull();
    expect(component.order()?.id).toBe(10);
  });

  it('does not display stale data as a successful update or send overlapping refreshes', () => {
    const component = render();
    const pending = new Subject<Order>();
    service.getById.mockReturnValue(pending);
    component.reload();
    component.reload();
    expect(service.getById).toHaveBeenCalledTimes(2);
    pending.error(new HttpErrorResponse({ status: 503 }));
    fixture.detectChanges();
    expect(component.order()?.id).toBe(10);
    expect(fixture.nativeElement.textContent).toContain('última consulta concluída');
  });

  it.each([403, 404])('handles HTTP %s without offering a blind retry', (status) => {
    service.getById.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    const component = render();
    expect(component.canRetry()).toBe(false);
    expect(component.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Tentar novamente');
    expect(component.order()).toBeNull();
  });

  it('rejects an invalid order ID before calling the API', () => {
    orderId = 'invalid';
    const component = render();
    expect(service.getById).not.toHaveBeenCalled();
    expect(component.canRetry()).toBe(false);
  });
});
