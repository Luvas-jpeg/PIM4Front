import { Component, computed, inject, signal } from '@angular/core';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models/product.models';
import { ProductService } from '../../core/services/product.service';

type ProductFilter = 'all' | 'equipment' | 'course';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly fallbackImageUrl =
    'https://images.unsplash.com/photo-1583912086096-8c60d75a53f9?auto=format&fit=crop&w=900&q=80';
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedFilter = signal<ProductFilter>('all');
  readonly searchTerm = signal('');

  readonly filteredProducts = computed(() => {
    const filter = this.selectedFilter();
    const search = this.searchTerm().trim().toLowerCase();

    return this.products().filter((product) => {
      const matchesFilter = filter === 'all' || product.tipoProduto === filter;
      const searchableText = [
        product.nome,
        product.description,
        product.category,
        product.location,
        product.instructor,
      ]
        .join(' ')
        .toLowerCase();

      return matchesFilter && searchableText.includes(search);
    });
  });

  constructor() {
    this.loadProducts();
  }

  setFilter(filter: ProductFilter): void {
    this.selectedFilter.set(filter);
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  addToCart(product: Product): void {
    if (!this.canAddToCart(product)) {
      return;
    }

    this.cartService.add(product, 1);
  }

  canAddToCart(product: Product): boolean {
    return product.estoque > 0;
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

  private loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.productService.getAll().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Nao foi possivel carregar os produtos.');
        this.loading.set(false);
      },
    });
  }
}
