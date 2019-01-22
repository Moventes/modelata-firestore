import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FirestoreDaoComponent } from './firestore-dao.component';

describe('FirestoreDaoComponent', () => {
  let component: FirestoreDaoComponent;
  let fixture: ComponentFixture<FirestoreDaoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FirestoreDaoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FirestoreDaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
