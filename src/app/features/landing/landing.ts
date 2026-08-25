import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../core/models/product.models';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private readonly productService = inject(ProductService);
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  private readonly fallbackImageUrl =
    'https://images.unsplash.com/photo-1583912086096-8c60d75a53f9?auto=format&fit=crop&w=900&q=80';

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);

  readonly featuredProducts = computed(() =>
    this.products()
      .filter(product => product.estoque > 0)
      .slice(0, 4)
  );

  readonly equipmentCount = computed(() =>
    this.products().filter(product => product.tipoProduto === 'equipment').length
  );

  readonly courseCount = computed(() =>
    this.products().filter(product => product.tipoProduto === 'course').length
  );

  constructor() {
    this.productService.getAll().subscribe({
      next: products => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
}
