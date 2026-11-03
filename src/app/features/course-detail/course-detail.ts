import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, finalize, map, switchMap, tap } from 'rxjs';
import { apiErrorMessage } from '../../core/http/api-error';
import { CourseRecommendation } from '../../core/models/course.models';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { Course, CourseClass } from '../../core/models/course.models';
import { CourseService } from '../../core/services/course.service';

@Component({
  selector: 'app-course-detail',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
})
export class CourseDetail {
  readonly maxCourseQuantity = 1;
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

  readonly recommendations = signal<CourseRecommendation[]>([]);
  readonly recommendationsLoading = signal(false);
  readonly recommendationsError = signal<string | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        switchMap((id) => {
          this.course.set(null);
          this.error.set(null);
          this.loading.set(true);
          this.recommendations.set([]);
          this.recommendationsError.set(null);
          this.recommendationsLoading.set(false);
          this.quantity.set(1);
          this.quantityError.set(null);
          this.cartError.set(null);
          this.selectedClass.set(null);
          this.classes.set([]);
          if (!Number.isInteger(id) || id <= 0) {
            this.error.set('Curso inválido.');
            this.loading.set(false);
            return EMPTY;
          }
          return this.courseService.getById(id).pipe(
            tap((course) => {
              this.course.set(course);
              const now = Date.now();
              const classes = course.classes.filter(
                (item) =>
                  item.status === 'scheduled' &&
                  item.availableSeats > 0 &&
                  new Date(item.startDate).getTime() >= now,
              );
              this.classes.set(classes);
              this.selectedClass.set(course.deliveryMode === 'ead' ? null : (classes[0] ?? null));
              this.loading.set(false);
              this.recommendationsLoading.set(true);
            }),
            switchMap(() =>
              this.courseService.getRecommendations(id).pipe(
                tap((result) => this.recommendations.set(result.items)),
                catchError(() => {
                  this.recommendationsError.set(
                    'As sugestões estão indisponíveis no momento. Você pode continuar consultando este curso.',
                  );
                  return EMPTY;
                }),
                finalize(() => this.recommendationsLoading.set(false)),
              ),
            ),
            catchError((response) => {
              this.error.set(
                apiErrorMessage(response, 'Não foi possível carregar os detalhes do curso.'),
              );
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  imageUrl(course: Course): string {
    return course.image?.trim() || this.fallbackImageUrl;
  }

  setFallbackImage(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.src = this.fallbackImageUrl;
  }

  decreaseQuantity(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
    this.quantityError.set(null);
    this.cartError.set(null);
  }

  increaseQuantity(): void {
    const available = Math.min(this.availableQuantity(), this.maxCourseQuantity);
    this.quantity.update((value) => Math.min(available, value + 1));
    this.quantityError.set(null);
  }

  selectClass(classId: number): void {
    const selected = this.classes().find((item) => item.id === classId) ?? null;
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
    return `${start.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} até ${end.toLocaleString(
      'pt-BR',
      {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    )}`;
  }

  addToCart(): void {
    const course = this.course();

    const selectedClass = this.selectedClass();

    if (!course) {
      return;
    }

    if (course.deliveryMode !== 'ead' && (!selectedClass || selectedClass.availableSeats < 1)) {
      this.quantityError.set('A turma selecionada nao possui vagas disponiveis.');
      return;
    }

    if (this.quantity() > this.availableQuantity()) {
      this.quantityError.set(
        `A quantidade solicitada excede o limite de ${this.availableQuantity()} inscricao(oes).`,
      );
      return;
    }

    this.quantityError.set(null);
    const added = this.cartService.addCourse(course, selectedClass ?? undefined, this.quantity());
    if (!added) {
      this.cartError.set(
        'Este curso ja possui outra turma no carrinho. Remova-a antes de escolher uma turma diferente.',
      );
      return;
    }

    this.cartError.set(null);
    void this.router.navigate(['/carrinho']);
  }

  isEad(course: Course): boolean {
    return course.deliveryMode === 'ead';
  }

  availableQuantity(): number {
    return this.course()?.deliveryMode === 'ead'
      ? this.maxCourseQuantity
      : (this.selectedClass()?.availableSeats ?? 1);
  }
}
