import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/product.models';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly storageKey = 'medishop_cart';

  readonly items = signal<CartItem[]>(this.getStoredItems());

  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.product.preco * item.quantity, 0)
  );

  readonly count = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  add(product: Product, quantity = 1): void {
    const items = [...this.items()];
    const existing = items.find(item => item.product.id === product.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ product, quantity });
    }

    this.setItems(items);
  }

  updateQuantity(productId: number, quantity: number): void {
    const items = this.items()
      .map(item => item.product.id === productId ? { ...item, quantity } : item)
      .filter(item => item.quantity > 0);

    this.setItems(items);
  }

  remove(productId: number): void {
    this.setItems(this.items().filter(item => item.product.id !== productId));
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
}