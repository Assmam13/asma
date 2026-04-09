import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Classification } from './classification';

describe('Classification', () => {
  let component: Classification;
  let fixture: ComponentFixture<Classification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Classification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Classification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
