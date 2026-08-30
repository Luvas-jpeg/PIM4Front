import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.models';

@Component({
  selector: 'app-course-detail',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
})
export class CourseDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly fallbackImageUrl =
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80';

  readonly course = signal<Product | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly quantity = signal(1);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('Curso invalido.');
      this.loading.set(false);
      return;
    }

    this.productService.getById(id).subscribe({
      next: product => {
        if (product.tipoProduto !== 'course') {
          this.error.set('Curso nao encontrado.');
        } else {
          this.course.set(product);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Nao foi possivel carregar os detalhes do curso.');
        this.loading.set(false);
      },
    });
  }

  imageUrl(course: Product): string {
    return course.image?.trim() || this.fallbackImageUrl;
  }

  setFallbackImage(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.src = this.fallbackImageUrl;
  }

  decreaseQuantity(): void {
    this.quantity.update(value => Math.max(1, value - 1));
  }

  increaseQuantity(): void {
    const available = this.course()?.estoque ?? 1;
    this.quantity.update(value => Math.min(available, value + 1));
  }

  addToCart(): void {
    const course = this.course();

    if (!course || course.estoque < 1) {
      return;
    }

    this.cartService.add(course, this.quantity());
    void this.router.navigate(['/carrinho']);
  }
}
