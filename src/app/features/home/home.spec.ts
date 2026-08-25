import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Home } from './home';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models/product.models';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let component: Home;

  const products: Product[] = [
    {
      id: 1,
      nome: 'Estetoscopio Profissional',
      preco: 289.9,
      tipoProduto: 'equipment',
      estoque: 10,
      description: 'Equipamento medico para ausculta.',
      image: 'https://example.com/stethoscope.jpg',
      category: 'Diagnostico',
      date: '',
      location: '',
      instructor: '',
    },
    {
      id: 2,
      nome: 'Curso de Primeiros Socorros',
      preco: 450,
      tipoProduto: 'course',
      estoque: 20,
      description: 'Curso presencial de primeiros socorros.',
      image: 'https://example.com/course.jpg',
      category: 'Treinamento',
      date: '10/08/2026',
      location: 'Sao Paulo - SP',
      instructor: 'Dra. Ana Costa',
    },
  ];

  const productServiceMock = {
    getAll: vi.fn(),
  };

  const cartServiceMock = {
    add: vi.fn(),
  };

  beforeEach(async () => {
    productServiceMock.getAll.mockReturnValue(of(products));

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        { provide: ProductService, useValue: productServiceMock },
        { provide: CartService, useValue: cartServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load products on init', () => {
    expect(productServiceMock.getAll).toHaveBeenCalled();
    expect(component.products()).toEqual(products);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('should filter products by equipment', () => {
    component.setFilter('equipment');

    expect(component.filteredProducts()).toHaveLength(1);
    expect(component.filteredProducts()[0].tipoProduto).toBe('equipment');
  });

  it('should filter products by course', () => {
    component.setFilter('course');

    expect(component.filteredProducts()).toHaveLength(1);
    expect(component.filteredProducts()[0].tipoProduto).toBe('course');
  });

  it('should filter products by search term', () => {
    component.updateSearch('primeiros');

    expect(component.filteredProducts()).toHaveLength(1);
    expect(component.filteredProducts()[0].nome).toContain('Primeiros');
  });

  it('should add product to cart', () => {
    component.addToCart(products[0]);

    expect(cartServiceMock.add).toHaveBeenCalledWith(products[0], 1);
  });

  it('should not add product without stock to cart', () => {
    const productWithoutStock = { ...products[0], estoque: 0 };

    component.addToCart(productWithoutStock);

    expect(cartServiceMock.add).not.toHaveBeenCalled();
  });

  it('should format prices in BRL', () => {
    expect(component.formatPrice(289.9)).toContain('289,90');
  });

  it('should set error when products cannot be loaded', () => {
    productServiceMock.getAll.mockReturnValue(
      throwError(() => new Error('API error')),
    );

    const errorFixture = TestBed.createComponent(Home);
    const errorComponent = errorFixture.componentInstance;

    errorFixture.detectChanges();

    expect(errorComponent.products()).toEqual([]);
    expect(errorComponent.loading()).toBe(false);
    expect(errorComponent.error()).toBe('Nao foi possivel carregar os produtos.');
  });
});
