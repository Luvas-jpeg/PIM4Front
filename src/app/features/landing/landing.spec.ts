import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Landing } from './landing';
import { ProductService } from '../../core/services/product.service';

describe('Landing', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;

  const productServiceMock = {
    getAll: vi.fn(() => of([])),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([]),
        { provide: ProductService, useValue: productServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load products', () => {
    expect(productServiceMock.getAll).toHaveBeenCalled();
  });
});
