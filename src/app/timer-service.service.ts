import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, of, Subject, BehaviorSubject } from 'rxjs';
import { AppInitServiceService } from './app-init-service.service';
import { thibTimerValue } from './data-model';

@Injectable({
  providedIn: 'root'
})

export class TimerServiceService {

  public timer_url = AppInitServiceService.settings.timer_url;
  public saveTimer_url = AppInitServiceService.settings.saveTimer_url;

  constructor(private http: HttpClient) { }

  getTimerValue(): Observable<thibTimerValue> {
    return this.http.get<thibTimerValue>(this.timer_url);
  }

  setTimerValue(timerData: string): Observable<any> {
    return this.http.post<any>(this.saveTimer_url, timerData);
  }

}
