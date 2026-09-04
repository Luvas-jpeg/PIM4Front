import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Course } from '../../core/models/course.models';
import { CourseService } from '../../core/services/course.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
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

  readonly filteredCourses = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    return this.courses().filter((course) => {
      const searchableText = [
        course.nome,
        course.description,
        course.category,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(search);
    });
  });

  constructor() {
    this.loadProducts();
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
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

  private loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.courseService.getAll().subscribe({
      next: (courses) => {
        this.courses.set(courses);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Nao foi possivel carregar os cursos.');
        this.loading.set(false);
      },
    });
  }
}
