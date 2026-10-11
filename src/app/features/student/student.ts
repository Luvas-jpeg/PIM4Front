import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MyEnrollment } from '../../core/models/enrollment.models';
import { AuthService } from '../../core/services/auth.service';
import { EnrollmentService } from '../../core/services/enrollment.service';

@Component({
  selector: 'app-student',
  imports: [DatePipe, RouterLink],
  templateUrl: './student.html',
  styleUrl: './student.scss',
})
export class Student {
  private readonly service = inject(EnrollmentService);
  private readonly destroyRef = inject(DestroyRef);
  readonly user = inject(AuthService).user;
  readonly enrollments = signal<MyEnrollment[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly status = signal('');
  readonly activeCount = computed(() => this.count('active'));
  readonly completedCount = computed(() => this.count('completed'));
  readonly cancelledCount = computed(() => this.count('cancelled'));
  readonly filteredEnrollments = computed(() => {
    const search = this.search().trim().toLocaleLowerCase('pt-BR');
    return this.enrollments().filter(item =>
      (!this.status() || item.enrollmentStatus === this.status()) &&
      (!search || [item.courseName, item.location, item.instructor]
        .join(' ').toLocaleLowerCase('pt-BR').includes(search)),
    );
  });

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.getMine().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: items => this.enrollments.set(items),
      error: () => this.error.set('Não foi possível carregar suas matrículas. Tente novamente.'),
    });
  }

  statusLabel(value: string): string {
    return ({ active: 'Ativa', completed: 'Concluída', cancelled: 'Cancelada' } as Record<string, string>)[value] ?? value;
  }

  private count(status: string): number {
    return this.enrollments().filter(item => item.enrollmentStatus === status).length;
  }
}