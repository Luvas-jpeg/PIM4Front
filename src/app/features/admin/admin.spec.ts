import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { Course } from '../../core/models/course.models';
import { CourseService } from '../../core/services/course.service';
import { OrderService } from '../../core/services/order.service';
import { PromoCodeService } from '../../core/services/promo-code.service';
import { StudentService } from '../../core/services/student.service';
import { AuditService } from '../../core/services/audit.service';

import { Admin } from './admin';

describe('Admin', () => {
  let component: Admin;
  let fixture: ComponentFixture<Admin>;
  let initialCourses: Subject<Course[]>;
  const existingCourse: Course = {
    id: 1,
    nome: 'Curso existente',
    description: '',
    preco: 100,
    image: '',
    category: '',
    deliveryMode: 'presencial',
    workloadHours: 8,
    isActive: true,
    classes: [],
    modules: [],
    assessments: [],
  };

  beforeEach(async () => {
    initialCourses = new Subject<Course[]>();
    await TestBed.configureTestingModule({
      imports: [Admin],
      providers: [
        { provide: CourseService, useValue: { getAll: () => initialCourses } },
        { provide: OrderService, useValue: { getAll: () => of([]) } },
        { provide: PromoCodeService, useValue: { getAll: () => of([]) } },
        { provide: StudentService, useValue: { getAll: () => of([]) } },
        { provide: AuditService, useValue: { getAll: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Admin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carrega os cursos quando a consulta nao concorre com um cadastro', () => {
    initialCourses.next([existingCourse]);
    initialCourses.complete();
    expect(component.courses()).toEqual([existingCourse]);
  });

  it('preserva curso e turma cadastrados quando a consulta inicial chega atrasada', () => {
    const createdCourse: Course = {
      ...existingCourse,
      id: 2,
      nome: 'Curso novo',
      classes: [
        {
          id: 3,
          courseId: 2,
          startDate: '2026-12-01T17:00:00Z',
          local: 'Sala nova',
          instructor: 'Instrutor',
          capacity: 10,
          availableSeats: 10,
          status: 'scheduled',
        },
      ],
    };
    component.setCourses([createdCourse, existingCourse]);
    initialCourses.next([existingCourse]);
    initialCourses.complete();
    expect(component.courses()).toEqual([createdCourse, existingCourse]);
    expect(component.courses()[0].classes[0].id).toBe(3);
  });

  it('acrescenta os cursos existentes sem perder um cadastro feito antes da carga inicial', () => {
    const createdCourse = { ...existingCourse, id: 2, nome: 'Curso novo' };
    component.setCourses([createdCourse]);
    initialCourses.next([existingCourse]);
    initialCourses.complete();
    expect(component.courses()).toEqual([createdCourse, existingCourse]);
  });
});
