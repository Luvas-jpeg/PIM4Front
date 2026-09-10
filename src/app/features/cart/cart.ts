import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartItem, CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models/product.models';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, DatePipe],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  private readonly cartService = inject(CartService);
  private readonly fallbackImageUrl =
    'https://images.unsplash.com/photo-1583912086096-8c60d75a53f9?auto=format&fit=crop&w=900&q=80';
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  readonly items = this.cartService.items;
  readonly total = this.cartService.total;
  readonly count = this.cartService.count;

  readonly hasItems = computed(() => this.items().length > 0);

  itemSubtotal(item: CartItem): number {
    return item.product.preco * item.quantity;
  }

  increase(item: CartItem): void {
    if (item.quantity >= this.availableQuantity(item)) {
      return;
    }

    this.cartService.updateQuantity(item, item.quantity + 1);
  }

  decrease(item: CartItem): void {
    this.cartService.updateQuantity(item, item.quantity - 1);
  }

  updateQuantity(item: CartItem, value: string): void {
    const parsedQuantity = Number(value);

    if (!Number.isFinite(parsedQuantity)) {
      return;
    }

    const quantity = Math.trunc(parsedQuantity);
    const safeQuantity = Math.min(Math.max(quantity, 0), this.availableQuantity(item));

    this.cartService.updateQuantity(item, safeQuantity);
  }

  remove(item: CartItem): void {
    this.cartService.remove(item);
  }

  clear(): void {
    this.cartService.clear();
  }

  imageUrl(product: Product): string {
    return product.image?.trim() || this.fallbackImageUrl;
  }

  setFallbackImage(event: Event): void {
    const image = event.target as HTMLImageElement;

    if (image.src === this.fallbackImageUrl) {
      return;
    }

    image.src = this.fallbackImageUrl;
  }

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  stockLabel(product: Product): string {
    return product.tipoProduto === 'course'
      ? `${product.estoque} vagas disponiveis`
      : `${product.estoque} unidades disponiveis`;
  }

  availableQuantity(item: CartItem): number {
    const available = item.courseClass?.availableSeats ?? item.product.estoque;
    return item.product.tipoProduto === 'course'
      ? Math.min(available, CartService.maxCourseQuantity)
      : available;
  }
}
