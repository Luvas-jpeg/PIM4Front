import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models/product.models';
import { Course, CourseClass } from '../../core/models/course.models';
import { CourseService } from '../../core/services/course.service';

@Component({
  selector: 'app-course-detail',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
})
export class CourseDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly courseService = inject(CourseService);
  private readonly cartService = inject(CartService);
  private readonly fallbackImageUrl =
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80';

  readonly course = signal<Course | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly quantity = signal(1);
  readonly classes = signal<CourseClass[]>([]);
  readonly selectedClass = signal<CourseClass | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('Curso invalido.');
      this.loading.set(false);
      return;
    }

    this.courseService.getById(id).subscribe({
      next: course => {
        this.course.set(course);
        const now = Date.now();
        const classes = course.classes.filter(item =>
          item.status === 'scheduled' &&
          item.availableSeats > 0 &&
          new Date(item.startDate).getTime() >= now,
        );
        this.classes.set(classes);
        this.selectedClass.set(classes[0] ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Nao foi possivel carregar os detalhes do curso.');
        this.loading.set(false);
      },
    });
  }

  imageUrl(course: Course): string {
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
    const available = this.selectedClass()?.availableSeats ?? 1;
    this.quantity.update(value => Math.min(available, value + 1));
  }

  selectClass(classId: number): void {
    const selected = this.classes().find(item => item.id === classId) ?? null;
    this.selectedClass.set(selected);
    this.quantity.set(1);
  }

  addToCart(): void {
    const course = this.course();

    const selectedClass = this.selectedClass();

    if (!course || !selectedClass || selectedClass.availableSeats < 1) {
      return;
    }

    this.cartService.addCourse(this.toCartProduct(course), selectedClass, this.quantity());
    void this.router.navigate(['/carrinho']);
  }

  private toCartProduct(course: Course): Product {
    return {
      id: course.id,
      nome: course.nome,
      preco: course.preco,
      tipoProduto: 'course',
      estoque: course.classes.reduce((total, item) => total + item.availableSeats, 0),
      description: course.description,
      image: course.image,
      category: course.category,
      date: '',
      location: '',
      instructor: '',
    };
  }
}
