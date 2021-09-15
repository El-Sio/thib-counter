import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { AppInitServiceService } from './app-init-service.service';
import {HttpClientModule} from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { TimerPageComponent } from './timer-page/timer-page.component';

export function initializeApp(appInitService: AppInitServiceService) {
  return (): Promise<any> => {
    return appInitService.load();
  };
}

@NgModule({
  declarations: [
    AppComponent,
    TimerPageComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [
    AppInitServiceService,
    { provide: APP_INITIALIZER, useFactory: initializeApp, deps: [AppInitServiceService], multi: true}
    // makes sure to load config before the app initializes
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
