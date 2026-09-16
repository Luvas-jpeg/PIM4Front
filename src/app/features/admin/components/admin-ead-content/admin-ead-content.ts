import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Course, CourseLessonRequest, CourseModule, CourseModuleRequest } from '../../../../core/models/course.models';
import { CourseService } from '../../../../core/services/course.service';
import { AdminNotification } from '../../admin.types';

@Component({
  selector: 'app-admin-ead-content',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-ead-content.html',
})
export class AdminEadContent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly courseService = inject(CourseService);

  @Input() courses: Course[] = [];
  @Output() coursesChange = new EventEmitter<Course[]>();
  @Output() notify = new EventEmitter<AdminNotification>();

  readonly selectedCourseId = signal<number | null>(null);
  readonly selectedModuleId = signal<number | null>(null);
  readonly savingModule = signal(false);
  readonly savingLesson = signal(false);
  readonly formError = signal<string | null>(null);

  readonly eadCourses = computed(() =>
    this.courses.filter(course => course.deliveryMode === 'ead')
  );

  readonly selectedCourse = computed(() =>
    this.eadCourses().find(course => course.id === this.selectedCourseId()) ?? this.eadCourses()[0] ?? null
  );

  readonly selectedModule = computed(() =>
    this.selectedCourse()?.modules.find(module => module.id === this.selectedModuleId()) ?? null
  );

  readonly moduleForm = this.formBuilder.group({
    title: this.formBuilder.control('', [Validators.required]),
    sortOrder: this.formBuilder.control(0, [Validators.required, Validators.min(0)]),
    isActive: this.formBuilder.control(true),
  });

  readonly lessonForm = this.formBuilder.group({
    title: this.formBuilder.control('', [Validators.required]),
    description: this.formBuilder.control(''),
    videoUrl: this.formBuilder.control(''),
    durationMinutes: this.formBuilder.control(0, [Validators.required, Validators.min(0)]),
    sortOrder: this.formBuilder.control(0, [Validators.required, Validators.min(0)]),
    isActive: this.formBuilder.control(true),
  });

  selectCourse(courseId: number): void {
    this.selectedCourseId.set(courseId);
    const course = this.eadCourses().find(item => item.id === courseId);
    this.selectedModuleId.set(course?.modules[0]?.id ?? null);
    this.formError.set(null);
  }

  selectModule(moduleId: number): void {
    this.selectedModuleId.set(moduleId);
    this.formError.set(null);
  }

  saveModule(): void {
    const course = this.selectedCourse();
    this.formError.set(null);

    if (!course) {
      this.formError.set('Cadastre um curso EAD antes de adicionar modulos.');
      return;
    }

    if (this.moduleForm.invalid) {
      this.moduleForm.markAllAsTouched();
      this.formError.set('Informe o titulo do modulo.');
      return;
    }

    const raw = this.moduleForm.getRawValue();
    const request: CourseModuleRequest = {
      title: raw.title,
      sortOrder: Number(raw.sortOrder),
      isActive: raw.isActive,
    };

    this.savingModule.set(true);
    this.courseService.createModule(course.id, request).subscribe({
      next: module => {
        this.patchCourse(course.id, {
          modules: [...course.modules, module].sort(this.sortModules),
        });
        this.selectedModuleId.set(module.id);
        this.moduleForm.reset({ title: '', sortOrder: 0, isActive: true });
        this.notify.emit({ type: 'success', message: 'Modulo EAD criado.' });
      },
      error: response => this.formError.set(response.error?.message ?? 'Nao foi possivel criar o modulo.'),
      complete: () => this.savingModule.set(false),
    });
  }

  saveLesson(): void {
    const course = this.selectedCourse();
    const module = this.selectedModule();
    this.formError.set(null);

    if (!course || !module) {
      this.formError.set('Selecione um modulo para adicionar aulas.');
      return;
    }

    if (this.lessonForm.invalid) {
      this.lessonForm.markAllAsTouched();
      this.formError.set('Informe os dados obrigatorios da aula.');
      return;
    }

    const raw = this.lessonForm.getRawValue();
    const request: CourseLessonRequest = {
      title: raw.title,
      description: raw.description,
      videoUrl: raw.videoUrl,
      durationMinutes: Number(raw.durationMinutes),
      sortOrder: Number(raw.sortOrder),
      isActive: raw.isActive,
    };

    this.savingLesson.set(true);
    this.courseService.createLesson(course.id, module.id, request).subscribe({
      next: lesson => {
        this.patchModule(course.id, module.id, {
          lessons: [...module.lessons, lesson].sort((first, second) =>
            first.sortOrder - second.sortOrder || first.title.localeCompare(second.title)
          ),
        });
        this.lessonForm.reset({
          title: '',
          description: '',
          videoUrl: '',
          durationMinutes: 0,
          sortOrder: 0,
          isActive: true,
        });
        this.notify.emit({ type: 'success', message: 'Aula EAD criada.' });
      },
      error: response => this.formError.set(response.error?.message ?? 'Nao foi possivel criar a aula.'),
      complete: () => this.savingLesson.set(false),
    });
  }

  private patchCourse(courseId: number, patch: Partial<Course>): void {
    this.coursesChange.emit(this.courses.map(course =>
      course.id === courseId ? { ...course, ...patch } : course
    ));
  }

  private patchModule(courseId: number, moduleId: number, patch: Partial<CourseModule>): void {
    this.coursesChange.emit(this.courses.map(course => {
      if (course.id !== courseId) return course;

      return {
        ...course,
        modules: course.modules.map(module =>
          module.id === moduleId ? { ...module, ...patch } : module
        ),
      };
    }));
  }

  private sortModules(first: CourseModule, second: CourseModule): number {
    return first.sortOrder - second.sortOrder || first.title.localeCompare(second.title);
  }
}
