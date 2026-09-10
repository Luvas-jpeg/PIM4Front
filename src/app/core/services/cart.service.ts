import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/product.models';
import { CourseClass } from '../models/course.models';

export interface CartItem {
  product: Product;
  quantity: number;
  courseClass?: CourseClass;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  static readonly maxCourseQuantity = 5;
  private readonly storageKey = 'medishop_cart';

  readonly items = signal<CartItem[]>(this.getStoredItems());

  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.product.preco * item.quantity, 0)
  );

  readonly count = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  add(product: Product, quantity = 1): void {
    this.addCourse(product, undefined, quantity);
  }

  addCourse(product: Product, courseClass?: CourseClass, quantity = 1): boolean {
    if (product.tipoProduto === 'course' && quantity > CartService.maxCourseQuantity) {
      return false;
    }

    const sameCourseWithAnotherClass = this.items().some(item =>
      item.product.tipoProduto === 'course' &&
      item.product.id === product.id &&
      item.courseClass?.id !== courseClass?.id,
    );

    if (sameCourseWithAnotherClass) {
      return false;
    }

    this.addCourseInternal(product, courseClass, quantity);
    return true;
  }

  private addCourseInternal(product: Product, courseClass: CourseClass | undefined, quantity: number): void {
    const items = [...this.items()];
    const existing = items.find(item =>
      item.product.id === product.id && item.courseClass?.id === courseClass?.id
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ product, courseClass, quantity });
    }

    this.setItems(items);
  }

  updateQuantity(item: CartItem, quantity: number): void {
    const maxQuantity = item.product.tipoProduto === 'course'
      ? Math.min(CartService.maxCourseQuantity, this.availableQuantity(item))
      : this.availableQuantity(item);
    const items = this.items()
      .map(current => current === item
        ? { ...current, quantity: Math.min(quantity, maxQuantity) }
        : current)
      .filter(item => item.quantity > 0);

    this.setItems(items);
  }

  remove(item: CartItem): void {
    this.setItems(this.items().filter(current => current !== item));
  }

  clear(): void {
    this.setItems([]);
  }

  private setItems(items: CartItem[]): void {
    this.items.set(items);
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  private getStoredItems(): CartItem[] {
    const rawItems = localStorage.getItem(this.storageKey);
    return rawItems ? JSON.parse(rawItems) as CartItem[] : [];
  }

  private availableQuantity(item: CartItem): number {
    return item.courseClass?.availableSeats ?? item.product.estoque;
  }
}