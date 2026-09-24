import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Course, CourseRequest } from '../../../../core/models/course.models';
import { CourseService } from '../../../../core/services/course.service';
import { AdminNotification } from '../../admin.types';

type ProductType = 'course';
type DeliveryMode = 'presencial' | 'ead';

@Component({
  selector: 'app-admin-courses',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-courses.html',
})
export class AdminCourses {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly courseService = inject(CourseService);
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  @Input() courses: Course[] = [];
  @Output() coursesChange = new EventEmitter<Course[]>();
  @Output() notify = new EventEmitter<AdminNotification>();

  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly editingCourseId = signal<number | null>(null);
  readonly formOpen = signal(false);

  readonly form = this.formBuilder.group({
    nome: this.formBuilder.control('', [Validators.required]),
    preco: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    tipoProduto: this.formBuilder.control<ProductType>('course', [Validators.required]),
    deliveryMode: this.formBuilder.control<DeliveryMode>('presencial', [Validators.required]),
    workloadHours: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0)]),
    estoque: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0)]),
    description: this.formBuilder.control(''),
    image: this.formBuilder.control(''),
    category: this.formBuilder.control(''),
    date: this.formBuilder.control(''),
    location: this.formBuilder.control(''),
    instructor: this.formBuilder.control(''),
  });

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  openCreateForm(): void {
    this.formError.set(null);
    this.resetForm();
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.formError.set(null);
  }

  resetForm(): void {
    this.editingCourseId.set(null);
    this.form.reset({
      nome: '',
      preco: null,
      tipoProduto: 'course',
      deliveryMode: 'presencial',
      workloadHours: null,
      estoque: null,
      description: '',
      image: '',
      category: '',
      date: '',
      location: '',
      instructor: '',
    });
  }

  editCourse(course: Course): void {
    this.editingCourseId.set(course.id);
    this.formOpen.set(true);
    this.form.setValue({
      nome: course.nome,
      preco: course.preco,
      tipoProduto: 'course',
      deliveryMode: course.deliveryMode ?? 'presencial',
      workloadHours: course.workloadHours ?? null,
      estoque: null,
      description: course.description ?? '',
      image: course.image ?? '',
      category: course.category ?? '',
      date: '',
      location: '',
      instructor: '',
    });
  }

  save(): void {
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Revise os dados do curso.');
      return;
    }

    const raw = this.form.getRawValue();
    const request: CourseRequest = {
      nome: raw.nome,
      description: raw.description,
      preco: Number(raw.preco),
      image: raw.image,
      category: raw.category,
      deliveryMode: raw.deliveryMode,
      workloadHours: Number(raw.workloadHours),
      isActive: true,
    };
    const editingId = this.editingCourseId();
    const action = editingId
      ? this.courseService.update(editingId, request)
      : this.courseService.create(request);

    this.saving.set(true);

    action.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: course => {
        const updated = editingId
          ? this.courses.map(current => current.id === course.id ? course : current)
          : [course, ...this.courses];
        this.coursesChange.emit(updated);
        this.resetForm();
        this.closeForm();
        this.notify.emit({ type: 'success', message: 'Curso salvo com sucesso.' });
      },
      error: response => this.formError.set(this.requestErrorMessage(
        response,
        'Nao foi possivel salvar o curso.',
      )),
    });
  }

  toggleCourseActive(course: Course): void {
    const action = course.isActive
      ? this.courseService.archive(course.id)
      : this.courseService.restore(course.id);

    action.subscribe({
      next: updatedCourse => {
        this.coursesChange.emit(this.courses.map(current =>
          current.id === updatedCourse.id ? updatedCourse : current
        ));
        this.notify.emit({
          type: 'success',
          message: course.isActive
            ? 'Curso arquivado. Ele nao sera exibido no catalogo publico.'
            : 'Curso restaurado e disponivel para o catalogo publico.',
        });
      },
      error: response => this.notify.emit({
        type: 'error',
        message: this.requestErrorMessage(
          response,
          course.isActive
            ? 'Nao foi possivel arquivar o curso.'
            : 'Nao foi possivel restaurar o curso.',
        ),
      }),
    });
  }

  private requestErrorMessage(response: { status?: number; error?: { message?: string } }, fallback: string): string {
    if (response.error?.message) return response.error.message;
    if (response.status === 401) return 'Sua sessao expirou ou nao possui autorizacao de administrador. Entre novamente.';
    if (response.status === 403) return 'Usuario autenticado sem permissao de administrador.';
    return fallback;
  }
}
