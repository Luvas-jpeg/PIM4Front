import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Course,
  CourseAssessment,
  CourseAssessmentRequest,
  CourseLessonRequest,
  CourseModule,
  CourseModuleRequest,
  CourseQuestionRequest,
} from '../../../../core/models/course.models';
import { CourseService } from '../../../../core/services/course.service';
import { AdminNotification } from '../../admin.types';

@Component({
  selector: 'app-admin-ead-content',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-ead-content.html',
})
export class AdminEadContent implements OnChanges {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly courseService = inject(CourseService);

  @Input() courses: Course[] = [];
  @Output() coursesChange = new EventEmitter<Course[]>();
  @Output() notify = new EventEmitter<AdminNotification>();

  readonly selectedCourseId = signal<number | null>(null);
  readonly selectedModuleId = signal<number | null>(null);
  private readonly coursesRevision = signal(0);
  readonly savingModule = signal(false);
  readonly savingLesson = signal(false);
  readonly savingAssessment = signal(false);
  readonly savingQuestion = signal(false);
  readonly formError = signal<string | null>(null);

  readonly eadCourses = computed(() =>
    (this.coursesRevision(), this.courses.filter(course => course.deliveryMode === 'ead'))
  );

  readonly selectedCourse = computed(() =>
    this.eadCourses().find(course => course.id === this.selectedCourseId()) ?? this.eadCourses()[0] ?? null
  );

  readonly selectedModule = computed(() =>
    this.selectedCourse()?.modules.find(module => module.id === this.selectedModuleId()) ?? null
  );

  readonly selectedAssessment = computed(() =>
    this.selectedCourse()?.assessments[0] ?? null
  );

  readonly moduleForm = this.formBuilder.group({
    title: this.formBuilder.control('', [Validators.required]),
    sortOrder: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0)]),
    isActive: this.formBuilder.control(true),
  });

  readonly lessonForm = this.formBuilder.group({
    title: this.formBuilder.control('', [Validators.required]),
    description: this.formBuilder.control(''),
    videoUrl: this.formBuilder.control(''),
    durationMinutes: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0)]),
    sortOrder: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0)]),
    isActive: this.formBuilder.control(true),
  });

  readonly assessmentForm = this.formBuilder.group({
    title: this.formBuilder.control('Avaliacao final', [Validators.required]),
    minimumScore: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0), Validators.max(100)]),
    maxAttempts: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(1)]),
    isActive: this.formBuilder.control(true),
  });

  readonly questionForm = this.formBuilder.group({
    statement: this.formBuilder.control('', [Validators.required]),
    sortOrder: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0)]),
    correctOption: this.formBuilder.control(0, [Validators.required, Validators.min(0), Validators.max(3)]),
    option1: this.formBuilder.control('', [Validators.required]),
    option2: this.formBuilder.control('', [Validators.required]),
    option3: this.formBuilder.control(''),
    option4: this.formBuilder.control(''),
    isActive: this.formBuilder.control(true),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['courses']) return;

    const course = this.selectedCourse();
    if (course && !this.selectedCourseId()) {
      this.selectedCourseId.set(course.id);
      this.selectedModuleId.set(course.modules[0]?.id ?? null);
    }

    this.syncAssessmentForm(this.selectedAssessment());
  }

  selectCourse(courseId: number): void {
    this.selectedCourseId.set(courseId);
    const course = this.eadCourses().find(item => item.id === courseId);
    this.selectedModuleId.set(course?.modules[0]?.id ?? null);
    this.syncAssessmentForm(course?.assessments[0] ?? null);
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
        this.moduleForm.reset({ title: '', sortOrder: null, isActive: true });
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
          durationMinutes: null,
          sortOrder: null,
          isActive: true,
        });
        this.notify.emit({ type: 'success', message: 'Aula EAD criada.' });
      },
      error: response => this.formError.set(response.error?.message ?? 'Nao foi possivel criar a aula.'),
      complete: () => this.savingLesson.set(false),
    });
  }

  saveAssessment(): void {
    const course = this.selectedCourse();
    this.formError.set(null);

    if (!course) {
      this.formError.set('Cadastre um curso EAD antes de configurar avaliacao.');
      return;
    }

    if (this.assessmentForm.invalid) {
      this.assessmentForm.markAllAsTouched();
      this.formError.set('Revise os dados da avaliacao.');
      return;
    }

    const raw = this.assessmentForm.getRawValue();
    const request: CourseAssessmentRequest = {
      title: raw.title,
      minimumScore: Number(raw.minimumScore),
      maxAttempts: Number(raw.maxAttempts),
      isActive: raw.isActive,
    };
    const assessment = this.selectedAssessment();
    const action = assessment
      ? this.courseService.updateAssessment(course.id, assessment.id, request)
      : this.courseService.createAssessment(course.id, request);

    this.savingAssessment.set(true);
    action.subscribe({
      next: savedAssessment => {
        this.patchCourse(course.id, {
          assessments: assessment
            ? course.assessments.map(current => current.id === savedAssessment.id ? savedAssessment : current)
            : [savedAssessment, ...course.assessments],
        });
        this.syncAssessmentForm(savedAssessment);
        this.notify.emit({ type: 'success', message: 'Avaliacao EAD salva.' });
      },
      error: response => this.formError.set(response.error?.message ?? 'Nao foi possivel salvar a avaliacao.'),
      complete: () => this.savingAssessment.set(false),
    });
  }

  saveQuestion(): void {
    const course = this.selectedCourse();
    const assessment = this.selectedAssessment();
    this.formError.set(null);

    if (!course || !assessment) {
      this.formError.set('Salve a avaliacao antes de cadastrar questoes.');
      return;
    }

    if (this.questionForm.invalid) {
      this.questionForm.markAllAsTouched();
      this.formError.set('Informe o enunciado e ao menos duas alternativas.');
      return;
    }

    const raw = this.questionForm.getRawValue();
    const optionTexts = [raw.option1, raw.option2, raw.option3, raw.option4]
      .map((text, index) => ({ text: text.trim(), index }))
      .filter(option => option.text);

    if (optionTexts.length < 2) {
      this.formError.set('A questao deve possuir ao menos duas alternativas.');
      return;
    }

    if (!optionTexts.some(option => option.index === Number(raw.correctOption))) {
      this.formError.set('A alternativa correta deve estar preenchida.');
      return;
    }

    const request: CourseQuestionRequest = {
      statement: raw.statement,
      sortOrder: Number(raw.sortOrder),
      isActive: raw.isActive,
      options: optionTexts.map((option, sortOrder) => ({
        text: option.text,
        isCorrect: option.index === Number(raw.correctOption),
        sortOrder,
      })),
    };

    this.savingQuestion.set(true);
    this.courseService.createQuestion(course.id, assessment.id, request).subscribe({
      next: question => {
        const updatedAssessment: CourseAssessment = {
          ...assessment,
          questions: [...assessment.questions, question].sort((first, second) =>
            first.sortOrder - second.sortOrder || first.id - second.id
          ),
        };
        this.patchAssessment(course.id, updatedAssessment);
        this.questionForm.reset({
          statement: '',
          sortOrder: null,
          correctOption: 0,
          option1: '',
          option2: '',
          option3: '',
          option4: '',
          isActive: true,
        });
        this.notify.emit({ type: 'success', message: 'Questao adicionada.' });
      },
      error: response => this.formError.set(response.error?.message ?? 'Nao foi possivel criar a questao.'),
      complete: () => this.savingQuestion.set(false),
    });
  }

  correctOptionText(assessment: CourseAssessment, questionId: number): string {
    return assessment.questions
      .find(question => question.id === questionId)
      ?.options.find(option => option.isCorrect)
      ?.text ?? 'Nao definida';
  }

  private patchCourse(courseId: number, patch: Partial<Course>): void {
    const updatedCourses = this.courses.map(course =>
      course.id === courseId ? { ...course, ...patch } : course
    );
    this.courses = updatedCourses;
    this.coursesRevision.update(value => value + 1);
    this.coursesChange.emit(updatedCourses);
  }

  private patchModule(courseId: number, moduleId: number, patch: Partial<CourseModule>): void {
    const updatedCourses = this.courses.map(course => {
      if (course.id !== courseId) return course;

      return {
        ...course,
        modules: course.modules.map(module =>
          module.id === moduleId ? { ...module, ...patch } : module
        ),
      };
    });
    this.courses = updatedCourses;
    this.coursesRevision.update(value => value + 1);
    this.coursesChange.emit(updatedCourses);
  }

  private patchAssessment(courseId: number, assessment: CourseAssessment): void {
    const updatedCourses = this.courses.map(course => {
      if (course.id !== courseId) return course;

      return {
        ...course,
        assessments: course.assessments.map(current =>
          current.id === assessment.id ? assessment : current
        ),
      };
    });
    this.courses = updatedCourses;
    this.coursesRevision.update(value => value + 1);
    this.coursesChange.emit(updatedCourses);
  }

  private syncAssessmentForm(assessment: CourseAssessment | null): void {
    this.assessmentForm.reset({
      title: assessment?.title ?? 'Avaliacao final',
      minimumScore: assessment?.minimumScore ?? null,
      maxAttempts: assessment?.maxAttempts ?? null,
      isActive: assessment?.isActive ?? true,
    });
  }

  private sortModules(first: CourseModule, second: CourseModule): number {
    return first.sortOrder - second.sortOrder || first.title.localeCompare(second.title);
  }
}
