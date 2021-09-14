import { TestBed } from '@angular/core/testing';

import { AppInitServiceService } from './app-init-service.service';

describe('AppInitServiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AppInitServiceService = TestBed.get(AppInitServiceService);
    expect(service).toBeTruthy();
  });
});
