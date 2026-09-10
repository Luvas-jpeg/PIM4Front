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
  readonly maxCourseQuantity = 5;
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
  readonly quantityError = signal<string | null>(null);
  readonly cartError = signal<string | null>(null);

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
    this.quantityError.set(null);
    this.cartError.set(null);
  }

  increaseQuantity(): void {
    const available = Math.min(
      this.selectedClass()?.availableSeats ?? 1,
      this.maxCourseQuantity,
    );
    this.quantity.update(value => Math.min(available, value + 1));
    this.quantityError.set(null);
  }

  selectClass(classId: number): void {
    const selected = this.classes().find(item => item.id === classId) ?? null;
    this.selectedClass.set(selected);
    this.quantity.set(1);
    this.quantityError.set(null);
    this.cartError.set(null);
  }

  classStatusLabel(courseClass: CourseClass): string {
    switch (courseClass.status) {
      case 'scheduled':
        return 'Inscrições abertas';
      case 'completed':
        return 'Concluída';
      case 'cancelled':
        return 'Cancelada';
      default:
        return courseClass.status;
    }
  }

  classPeriod(courseClass: CourseClass): string {
    const start = new Date(courseClass.startDate);
    if (!courseClass.endDate) {
      return start.toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    }

    const end = new Date(courseClass.endDate);
    return `${start.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} até ${end.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })}`;
  }

  addToCart(): void {
    const course = this.course();

    const selectedClass = this.selectedClass();

    if (!course || !selectedClass || selectedClass.availableSeats < 1) {
      this.quantityError.set('A turma selecionada nao possui vagas disponiveis.');
      return;
    }

    if (this.quantity() > selectedClass.availableSeats) {
      this.quantityError.set(
        `A quantidade solicitada excede as ${selectedClass.availableSeats} vaga(s) disponiveis.`,
      );
      return;
    }

    this.quantityError.set(null);
    const added = this.cartService.addCourse(
      this.toCartProduct(course),
      selectedClass,
      this.quantity(),
    );
    if (!added) {
      this.cartError.set('Este curso ja possui outra turma no carrinho. Remova-a antes de escolher uma turma diferente.');
      return;
    }

    this.cartError.set(null);
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
