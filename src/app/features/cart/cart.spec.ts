import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Cart } from './cart';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models/product.models';
import { CourseClass } from '../../core/models/course.models';

describe('Cart', () => {
  let component: Cart;
  let fixture: ComponentFixture<Cart>;
  let cartService: CartService;

  const product: Product = {
    id: 1,
    nome: 'Estetoscopio',
    preco: 120,
    tipoProduto: 'equipment',
    estoque: 3,
    description: 'Equipamento para atendimento clinico.',
    image: '',
    category: 'Diagnostico',
    date: '',
    location: '',
    instructor: '',
  };

  const course: Product = {
    ...product,
    id: 10,
    nome: 'Curso de primeiros socorros',
    tipoProduto: 'course',
    estoque: 10,
  };

  const firstClass: CourseClass = {
    id: 101,
    courseId: 10,
    startDate: '2026-10-01T09:00:00Z',
    endDate: null,
    local: 'Sao Paulo',
    instructor: 'Instrutor',
    capacity: 10,
    availableSeats: 10,
    status: 'scheduled',
  };

  const secondClass: CourseClass = {
    ...firstClass,
    id: 102,
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Cart],
      providers: [provideRouter([])],
    }).compileComponents();

    cartService = TestBed.inject(CartService);
    fixture = TestBed.createComponent(Cart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate item subtotal', () => {
    expect(component.itemSubtotal({ product, quantity: 2 })).toBe(240);
  });

  it('should increase quantity up to stock limit', () => {
    cartService.add(product, 2);
    const item = cartService.items()[0];

    component.increase(item);
    component.increase(cartService.items()[0]);

    expect(cartService.items()[0].quantity).toBe(3);
  });

  it('should decrease quantity and remove item when quantity reaches zero', () => {
    cartService.add(product, 1);

    component.decrease(cartService.items()[0]);

    expect(cartService.items()).toEqual([]);
  });

  it('should clear cart', () => {
    cartService.add(product, 1);

    component.clear();

    expect(cartService.items()).toEqual([]);
  });

  it('should format price using Brazilian currency', () => {
    expect(component.formatPrice(120)).toContain('120');
  });

  it('should not mix different classes of the same course', () => {
    expect(cartService.addCourse(course, firstClass, 1)).toBe(true);
    expect(cartService.addCourse(course, secondClass, 1)).toBe(false);
    expect(cartService.items()).toHaveLength(1);
  });

  it('should cap course quantities at five enrollments', () => {
    expect(cartService.addCourse(course, firstClass, 6)).toBe(false);
    expect(cartService.items()).toHaveLength(0);

    cartService.addCourse(course, firstClass, 1);
    component.updateQuantity(cartService.items()[0], '9');

    expect(cartService.items()[0].quantity).toBe(5);
  });
});
