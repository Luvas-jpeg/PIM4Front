import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { Order } from '../../../../core/models/order.models';
import { AdminOrders } from './admin-orders';

@Component({
  imports: [AdminOrders],
  template: `<app-admin-orders
      [orders]="orders"
      (ordersChange)="orders = $event"
      (notify)="message = $event.message"
    />
    <p role="alert">{{ message }}</p>`,
})
class Host {
  message = '';
  orders: Order[] = [
    {
      id: 10,
      dataPedido: '2026-11-03T12:00:00Z',
      status: 'pending',
      paymentStatus: 'pending',
      total: 120,
      valorFrete: 0,
      paymentMethod: 'pix',
      promoCode: '',
      itens: [],
    },
  ];
}

describe('Administrative order errors', () => {
  let fixture: ComponentFixture<Host>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(Host);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function selectStatus(status = 'processing'): HTMLSelectElement {
    const select = fixture.nativeElement.querySelector(
      '.table--orders .table-row select',
    ) as HTMLSelectElement;
    select.value = status;
    select.dispatchEvent(new Event('change'));
    return select;
  }

  it('shows the API rejection and keeps the original state in both the row and the model', () => {
    const select = selectStatus();
    const req = http.expectOne('/api/Orders/10/status');
    expect(req.request.body).toEqual({ status: 'processing' });
    req.flush(
      { message: 'Somente pedidos pagos podem avancar de situacao.' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Somente pedidos pagos podem avancar de situacao.',
    );
    expect(select.value).toBe('pending');
    expect(fixture.componentInstance.orders[0].status).toBe('pending');
  });

  it('updates the selection only after a successful response', () => {
    const select = selectStatus();
    expect(select.value).toBe('pending');
    http.expectOne('/api/Orders/10/status').flush({ id: 10, status: 'processing' });
    fixture.detectChanges();
    expect(select.value).toBe('processing');
    expect(fixture.componentInstance.message).toBe('Status do pedido atualizado.');
  });

  it('explains a lost connection instead of claiming that a business rule failed', () => {
    selectStatus();
    http.expectOne('/api/Orders/10/status').error(new ProgressEvent('error'));
    expect(fixture.componentInstance.message).toContain('Verifique sua conexão');
  });

  it('shows the reason for a rejected refund', () => {
    const component = fixture.debugElement.query(By.directive(AdminOrders))
      .componentInstance as AdminOrders;
    component.refundOrder(fixture.componentInstance.orders[0]);
    http
      .expectOne('/api/Orders/10/refund')
      .flush(
        { message: 'Somente pedidos pagos podem ser reembolsados.' },
        { status: 400, statusText: 'Bad Request' },
      );
    expect(fixture.componentInstance.message).toBe('Somente pedidos pagos podem ser reembolsados.');
  });

  it('keeps a generic fallback when no usable message exists', () => {
    selectStatus();
    http.expectOne('/api/Orders/10/status').flush({}, { status: 400, statusText: 'Bad Request' });
    expect(fixture.componentInstance.message).toBe('Não foi possível atualizar o pedido.');
  });

  it('shows an event loading failure inside the dialog and ends the loading indicator', () => {
    const component = fixture.debugElement.query(By.directive(AdminOrders))
      .componentInstance as AdminOrders;
    component.openDetails(fixture.componentInstance.orders[0]);
    http
      .expectOne('/api/payments/webhook-events?orderId=10')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('temporariamente indisponível');
    expect(dialog.textContent).not.toContain('Nenhum evento de webhook');
    expect(component.loadingWebhookEvents()).toBe(false);
  });
});
