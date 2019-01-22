import { TestBed } from '@angular/core/testing';

import { FirestoreDaoService } from './firestore-dao.service';

describe('FirestoreDaoService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FirestoreDaoService = TestBed.get(FirestoreDaoService);
    expect(service).toBeTruthy();
  });
});
