import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TimerPageComponent } from './timer-page/timer-page.component';

const routes: Routes = [
  { path: '', redirectTo: 'timer/1', pathMatch: 'full' },
  { path: 'timer/:id', component: TimerPageComponent }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {onSameUrlNavigation: 'reload', useHash: true })
  ],
  exports: [RouterModule]
})

export class AppRoutingModule { }
export const appRoutingModule = RouterModule.forRoot(routes, {onSameUrlNavigation: 'reload', useHash: true });
