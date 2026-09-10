import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Landing } from './landing';
import { CourseService } from '../../core/services/course.service';

describe('Landing', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;

  const courseServiceMock = {
    getCatalog: vi.fn(() => of({
      items: [],
      page: 1,
      pageSize: 4,
      totalItems: 0,
      totalPages: 0,
    })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([]),
        { provide: CourseService, useValue: courseServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load courses', () => {
    expect(courseServiceMock.getCatalog).toHaveBeenCalled();
  });
});
