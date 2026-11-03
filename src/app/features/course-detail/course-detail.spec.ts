import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { CourseService } from '../../core/services/course.service';
import { Course } from '../../core/models/course.models';
import { CourseDetail } from './course-detail';

describe('Course recommendations', () => {
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let fixture: ComponentFixture<CourseDetail>;
  const course = (id: number): Course => ({
    id,
    nome: `Curso ${id}`,
    category: 'Saúde',
    description: '',
    preco: 100,
    image: '',
    deliveryMode: 'presencial',
    workloadHours: 8,
    isActive: true,
    classes: [],
    modules: [],
    assessments: [],
  });
  const service = { getById: vi.fn(), getRecommendations: vi.fn() };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ id: '1' }));
    service.getById.mockReset().mockImplementation((id: number) => of(course(id)));
    service.getRecommendations.mockReset().mockReturnValue(of({ items: [] }));
    await TestBed.configureTestingModule({
      imports: [CourseDetail],
      providers: [
        provideRouter([]),
        { provide: CourseService, useValue: service },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CourseDetail);
  });

  it('loads the new course and its suggestions when following a recommendation', () => {
    params.next(convertToParamMap({ id: '2' }));
    expect(fixture.componentInstance.course()?.id).toBe(2);
    expect(service.getRecommendations).toHaveBeenLastCalledWith(2);
  });

  it('preserves the course when the recommendation service fails', () => {
    service.getRecommendations.mockReturnValue(throwError(() => new Error('offline')));
    params.next(convertToParamMap({ id: '3' }));
    expect(fixture.componentInstance.course()?.id).toBe(3);
    expect(fixture.componentInstance.error()).toBeNull();
    expect(fixture.componentInstance.recommendationsError()).toContain('indisponíveis');
    expect(fixture.componentInstance.recommendationsLoading()).toBe(false);
  });

  it('does not request predictions for an invalid route', () => {
    service.getById.mockClear();
    service.getRecommendations.mockClear();
    params.next(convertToParamMap({ id: 'invalid' }));
    expect(service.getById).not.toHaveBeenCalled();
    expect(service.getRecommendations).not.toHaveBeenCalled();
    expect(fixture.componentInstance.loading()).toBe(false);
  });
});
