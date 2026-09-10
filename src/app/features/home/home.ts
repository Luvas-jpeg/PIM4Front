import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Course, PagedCourseResponse } from '../../core/models/course.models';
import { CourseService } from '../../core/services/course.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly courseService = inject(CourseService);
  private readonly fallbackImageUrl =
    'https://images.unsplash.com/photo-1583912086096-8c60d75a53f9?auto=format&fit=crop&w=900&q=80';
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  readonly courses = signal<Course[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly category = signal('');
  readonly city = signal('');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly sort = signal('date');
  readonly page = signal(1);
  readonly totalPages = signal(1);

  readonly categories = signal<string[]>([]);
  readonly cities = signal<string[]>([]);

  constructor() {
    this.courseService.getCatalogOptions().subscribe({
      next: (options) => {
        this.categories.set(options.categories);
        this.cities.set(options.cities);
      },
      error: () => {
        this.error.set('Nao foi possivel carregar as opcoes de filtro.');
      },
    });
    this.loadProducts();
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
    this.loadProducts();
  }

  updateCategory(value: string): void {
    this.category.set(value);
    this.page.set(1);
    this.loadProducts();
  }

  updateCity(value: string): void {
    this.city.set(value);
  }

  updateStartDate(value: string): void {
    this.startDate.set(value);
  }

  updateEndDate(value: string): void {
    this.endDate.set(value);
  }

  applyFilters(): void {
    this.page.set(1);
    this.loadProducts();
  }

  updateSort(value: string): void {
    this.sort.set(value);
    this.page.set(1);
    this.loadProducts();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.loadProducts();
  }

  imageUrl(course: Course): string {
    return course.image?.trim() || this.fallbackImageUrl;
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

  nextClass(course: Course) {
    return course.classes
      .filter((courseClass) => courseClass.status === 'scheduled' && courseClass.availableSeats > 0)
      .sort((first, second) =>
        new Date(first.startDate).getTime() - new Date(second.startDate).getTime(),
      )[0] ?? null;
  }

  availabilityLabel(course: Course): string {
    const courseClass = this.nextClass(course);
    if (!courseClass) return 'Sem vagas disponíveis';
    if (courseClass.availableSeats <= 5) return `${courseClass.availableSeats} vaga(s) restantes`;
    return `${courseClass.availableSeats} vagas disponíveis`;
  }

  private loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.courseService.getCatalog({
      search: this.searchTerm(),
      category: this.category(),
      city: this.city(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      sort: this.sort(),
      page: this.page(),
      pageSize: 9,
    }).subscribe({
      next: (response: PagedCourseResponse) => {
        this.courses.set(response.items);
        this.totalPages.set(response.totalPages || 1);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Nao foi possivel carregar os cursos.');
        this.loading.set(false);
      },
    });
  }
}
