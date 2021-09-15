import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { reject } from 'q';

export interface IAppConfig {
  timer_url: string;
  saveTimer_url: string;
  MAX_TIMER: number;
  big: number;
  small: number;
}

@Injectable({
  providedIn: 'root'
})
export class AppInitServiceService {

  static settings: IAppConfig;

  constructor(private http: HttpClient) { }

// method called as a loading blocker to ensure config is loaded before the app is initialized
load() {
  const jsonFile = `assets/config/config.json`; // static configuration file

  // APP_INITIALIZER is wating for a promise to resolve

      return new Promise<void>((res, rej) => {
        this.http.get<any>(jsonFile).toPromise().then((confjson: any) => {
          AppInitServiceService.settings = <IAppConfig>confjson;
          console.log('Config Loaded');
          res(); })
          .catch((response: any) => {
            reject(`Could not Load the config file`);
          });
        });
      }

}
