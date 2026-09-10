import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Course } from '../../core/models/course.models';
import { CourseService } from '../../core/services/course.service';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private readonly courseService = inject(CourseService);
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  private readonly fallbackImageUrl =
    'https://images.unsplash.com/photo-1583912086096-8c60d75a53f9?auto=format&fit=crop&w=900&q=80';

  readonly courses = signal<Course[]>([]);
  readonly loading = signal(true);
  readonly featuredCourses = signal<Course[]>([]);

  constructor() {
    this.courseService.getCatalog({ page: 1, pageSize: 4, sort: 'relevance' }).subscribe({
      next: response => {
        this.courses.set(response.items);
        this.featuredCourses.set(response.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
}
