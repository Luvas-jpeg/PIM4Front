import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Course } from '../../core/models/course.models';
import { CourseService } from '../../core/services/course.service';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements AfterViewInit {
  private readonly courseService = inject(CourseService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  private readonly fallbackImageUrl =
    'https://images.unsplash.com/photo-1583912086096-8c60d75a53f9?auto=format&fit=crop&w=900&q=80';

  readonly courses = signal<Course[]>([]);
  readonly loading = signal(true);
  readonly featuredCourses = signal<Course[]>([]);

  @ViewChild('categoryGrid') private categoryGrid?: ElementRef<HTMLElement>;
  @ViewChild('trustBand') private trustBand?: ElementRef<HTMLElement>;

  constructor() {
    this.courseService.getCatalog({ page: 1, pageSize: 4, sort: 'relevance' }).subscribe({
      next: (response) => {
        this.courses.set(response.items);
        this.featuredCourses.set(response.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  ngAfterViewInit(): void {
    if (!('IntersectionObserver' in window)) {
      this.categoryGrid?.nativeElement.classList.add('is-visible');
      this.trustBand?.nativeElement.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          element.classList.add('is-visible');
          observer.unobserve(element);
        }
      },
      { threshold: 0.15 },
    );

    this.destroyRef.onDestroy(() => observer.disconnect());

    if (this.categoryGrid) observer.observe(this.categoryGrid.nativeElement);
    if (this.trustBand) observer.observe(this.trustBand.nativeElement);
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
