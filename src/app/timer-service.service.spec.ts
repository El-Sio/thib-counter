import { TestBed } from '@angular/core/testing';

import { TimerServiceService } from './timer-service.service';

describe('TimerServiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TimerServiceService = TestBed.get(TimerServiceService);
    expect(service).toBeTruthy();
  });
});
