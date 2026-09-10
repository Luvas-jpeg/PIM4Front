import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Home } from './home';
import { CourseService } from '../../core/services/course.service';
import { Course } from '../../core/models/course.models';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let component: Home;

  const courses: Course[] = [
    {
      id: 1,
      nome: 'Curso de Primeiros Socorros',
      preco: 450,
      description: 'Curso presencial de primeiros socorros.',
      image: 'https://example.com/stethoscope.jpg',
      category: 'Treinamento',
      isActive: true,
      classes: [],
    },
    {
      id: 2,
      nome: 'Curso de Atendimento',
      preco: 289.9,
      description: 'Curso presencial de atendimento clinico.',
      image: 'https://example.com/course.jpg',
      category: 'Treinamento',
      isActive: true,
      classes: [],
    },
  ];

  const courseServiceMock = {
    getAll: vi.fn(),
    getCatalog: vi.fn(),
    getCatalogOptions: vi.fn(),
  };

  beforeEach(async () => {
    courseServiceMock.getCatalog.mockReturnValue(of({
      items: courses,
      page: 1,
      pageSize: 9,
      totalItems: courses.length,
      totalPages: 1,
    }));
    courseServiceMock.getCatalogOptions.mockReturnValue(of({
      categories: ['Treinamento'],
      cities: ['Sao Paulo'],
    }));

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: CourseService, useValue: courseServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load courses on init', () => {
    expect(courseServiceMock.getCatalog).toHaveBeenCalled();
    expect(component.courses()).toEqual(courses);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('should filter courses by search term', () => {
    component.updateSearch('primeiros');

    expect(courseServiceMock.getCatalog).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'primeiros', page: 1 }),
    );
  });

  it('should format prices in BRL', () => {
    expect(component.formatPrice(289.9)).toContain('289,90');
  });

  it('should send the selected period to the catalog API', () => {
    component.updateStartDate('2026-10-01');
    component.updateEndDate('2026-10-31');
    component.applyFilters();

    expect(courseServiceMock.getCatalog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      }),
    );
  });

  it('should set error when courses cannot be loaded', () => {
    courseServiceMock.getCatalog.mockReturnValue(
      throwError(() => new Error('API error')),
    );

    const errorFixture = TestBed.createComponent(Home);
    const errorComponent = errorFixture.componentInstance;

    errorFixture.detectChanges();

    expect(errorComponent.courses()).toEqual([]);
    expect(errorComponent.loading()).toBe(false);
    expect(errorComponent.error()).toBe('Nao foi possivel carregar os cursos.');
  });
});
