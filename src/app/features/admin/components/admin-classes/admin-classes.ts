import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Course, CourseClass, CourseClassRequest } from '../../../../core/models/course.models';
import { Student } from '../../../../core/models/student.models';
import { CourseService } from '../../../../core/services/course.service';
import { AdminNotification } from '../../admin.types';

@Component({
  selector: 'app-admin-classes',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './admin-classes.html',
})
export class AdminClasses {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly courseService = inject(CourseService);

  @Input() courses: Course[] = [];
  @Output() coursesChange = new EventEmitter<Course[]>();
  @Output() notify = new EventEmitter<AdminNotification>();

  readonly selectedCourse = signal<Course | null>(null);
  readonly selectedClass = signal<CourseClass | null>(null);
  readonly selectedStudents = signal<Student[]>([]);
  readonly formOpen = signal(false);
  readonly formError = signal<string | null>(null);
  readonly editingClassId = signal<number | null>(null);
  readonly transferringStudentId = signal<number | null>(null);

  readonly form = this.formBuilder.group({
    startDate: this.formBuilder.control('', [Validators.required]),
    endDate: this.formBuilder.control(''),
    local: this.formBuilder.control('', [Validators.required]),
    instructor: this.formBuilder.control('', [Validators.required]),
    capacity: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(1)]),
    status: this.formBuilder.control('scheduled', [Validators.required]),
  });

  openClassForm(course: Course, courseClass?: CourseClass): void {
    if (course.deliveryMode === 'ead') {
      this.notify.emit({ type: 'error', message: 'Cursos EAD nao possuem turmas presenciais.' });
      return;
    }

    this.formError.set(null);
    this.selectedCourse.set(course);
    this.editingClassId.set(courseClass?.id ?? null);
    this.formOpen.set(true);
    this.form.setValue({
      startDate: courseClass ? this.toDateTimeLocal(courseClass.startDate) : '',
      endDate: courseClass?.endDate ? this.toDateTimeLocal(courseClass.endDate) : '',
      local: courseClass?.local ?? '',
      instructor: courseClass?.instructor ?? '',
      capacity: courseClass?.capacity ?? null,
      status: courseClass?.status ?? 'scheduled',
    });
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingClassId.set(null);
    this.formError.set(null);
  }

  saveClass(): void {
    this.formError.set(null);
    const course = this.selectedCourse();

    if (!course) {
      this.formError.set('Selecione um curso para cadastrar a turma.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Revise os dados da turma.');
      return;
    }

    const raw = this.form.getRawValue();
    const request: CourseClassRequest = {
      startDate: new Date(raw.startDate).toISOString(),
      endDate: raw.endDate ? new Date(raw.endDate).toISOString() : null,
      local: raw.local,
      instructor: raw.instructor,
      capacity: Number(raw.capacity),
      status: raw.status,
    };
    const editingId = this.editingClassId();
    const action = editingId
      ? this.courseService.updateClass(course.id, editingId, request)
      : this.courseService.createClass(course.id, request);

    action.subscribe({
      next: savedClass => {
        this.coursesChange.emit(this.courses.map(current => {
          if (current.id !== course.id) return current;

          const classes = editingId
            ? current.classes.map(item => item.id === savedClass.id ? savedClass : item)
            : [...current.classes, savedClass];
          return { ...current, classes };
        }));
        this.closeForm();
        this.notify.emit({ type: 'success', message: 'Turma salva com sucesso.' });
      },
      error: response => this.formError.set(response.error?.message ?? 'Nao foi possivel salvar a turma.'),
    });
  }

  openClassModal(course: Course, courseClass: CourseClass): void {
    this.selectedCourse.set(course);
    this.selectedClass.set(courseClass);
    this.selectedStudents.set([]);
    this.courseService.getClassStudents(course.id, courseClass.id).subscribe({
      next: students => this.selectedStudents.set(students),
      error: () => this.notify.emit({ type: 'error', message: 'Nao foi possivel carregar os alunos da turma.' }),
    });
  }

  closeClassModal(): void {
    this.selectedCourse.set(null);
    this.selectedClass.set(null);
    this.selectedStudents.set([]);
  }

  studentsForCourse(courseId: number): Student[] {
    return courseId === this.selectedCourse()?.id ? this.selectedStudents() : [];
  }

  exportClassStudents(): void {
    const course = this.selectedCourse();
    const courseClass = this.selectedClass();
    const students = this.selectedStudents();

    if (!course || !courseClass || !students.length) return;

    const headers = ['Nome', 'E-mail', 'Telefone', 'Data da matricula', 'Status'];
    const rows = students.map(student => [
      student.name,
      student.email,
      student.phone,
      student.enrollmentDate,
      this.studentStatusLabel(student.status),
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);

    anchor.href = url;
    anchor.download = `lista-presenca-${this.slugify(course.nome)}-turma-${courseClass.id}-${date}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  updateStudentStatus(student: Student, status: Student['status']): void {
    const course = this.selectedCourse();
    const courseClass = this.selectedClass();

    if (!course || !courseClass) return;

    const previousStatus = student.status;
    this.courseService.updateStudentStatus(course.id, courseClass.id, student.id, status).subscribe({
      next: updatedStudent => {
        this.selectedStudents.update(students => students.map(current =>
          current.id === updatedStudent.id ? updatedStudent : current
        ));
        this.patchClassSeats(
          course.id,
          courseClass.id,
          previousStatus !== 'cancelled' && status === 'cancelled'
            ? 1
            : previousStatus === 'cancelled' && status !== 'cancelled'
              ? -1
              : 0,
        );
        this.notify.emit({ type: 'success', message: 'Status da matricula atualizado.' });
      },
      error: response => this.notify.emit({
        type: 'error',
        message: response.error?.message ?? 'Nao foi possivel atualizar o status da matricula.',
      }),
    });
  }

  transferStudent(student: Student, targetClassId: number): void {
    const course = this.selectedCourse();
    const currentClass = this.selectedClass();

    if (!course || !currentClass || !targetClassId) return;

    this.transferringStudentId.set(student.id);
    this.courseService.transferStudent(course.id, currentClass.id, student.id, targetClassId).subscribe({
      next: response => {
        this.selectedStudents.update(students =>
          students.filter(current => current.id !== student.id)
        );
        this.coursesChange.emit(this.courses.map(currentCourse => {
          if (currentCourse.id !== course.id) return currentCourse;

          return {
            ...currentCourse,
            classes: currentCourse.classes.map(courseClass => {
              if (courseClass.id === response.sourceClass.id) return response.sourceClass;
              if (courseClass.id === response.targetClass.id) return response.targetClass;
              return courseClass;
            }),
          };
        }));
        this.selectedClass.set(response.sourceClass);
        this.notify.emit({ type: 'success', message: 'Aluno transferido para outra turma.' });
      },
      error: response => this.notify.emit({
        type: 'error',
        message: response.error?.message ?? 'Nao foi possivel transferir o aluno.',
      }),
      complete: () => this.transferringStudentId.set(null),
    });
  }

  toNumber(value: string): number {
    return Number(value);
  }

  studentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Ativa',
      completed: 'Concluida',
      cancelled: 'Cancelada',
    };

    return labels[status] ?? status;
  }

  private patchClassSeats(courseId: number, classId: number, delta: number): void {
    if (delta === 0) return;

    const updatedCourses = this.courses.map(course => {
      if (course.id !== courseId) return course;

      return {
        ...course,
        classes: course.classes.map(courseClass =>
          courseClass.id === classId
            ? {
                ...courseClass,
                availableSeats: Math.min(
                  courseClass.capacity,
                  Math.max(0, courseClass.availableSeats + delta),
                ),
              }
            : courseClass
        ),
      };
    });

    this.coursesChange.emit(updatedCourses);
    this.selectedClass.update(current => current && current.id === classId
      ? {
          ...current,
          availableSeats: Math.min(current.capacity, Math.max(0, current.availableSeats + delta)),
        }
      : current);
  }

  private toDateTimeLocal(value: string): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'curso';
  }
}
