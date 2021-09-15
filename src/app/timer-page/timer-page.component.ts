import { Component, OnInit } from '@angular/core';
import { cp } from '@angular/core/src/render3';
import { interval, fromEvent, Observable, BehaviorSubject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { AppInitServiceService } from '../app-init-service.service';
import { thibTimerValue, thibTimerchild } from '../data-model';
import { TimerServiceService } from '../timer-service.service';

@Component({
  selector: 'app-timer-page',
  templateUrl: './timer-page.component.html',
  styleUrls: ['./timer-page.component.css']
})

export class TimerPageComponent implements OnInit {

  public timer = '';
  public timermili = 0
  public message = '';
  public hasChanged = false;
  public isReading = false;
  public timesUp = false;
  public isPlaying = false;
  public selectedChild: thibTimerchild = {"id": 0, "name":"--"};
  public children: thibTimerchild[] = [];
  public childrenTime: thibTimerValue[] = [];
  public readingsub;
  public playingsub;
  public small = AppInitServiceService.settings.small; // minutes
  public big = AppInitServiceService.settings.big; // minutes
  public second$ = interval(1000);
  public playseconds$ = interval(1000);
  public MAXTIMER = AppInitServiceService.settings.MAX_TIMER
  public gaugeElement = document.querySelector(".gauge");
  public thibTimer: thibTimerValue;

setGaugeValue(gauge, value) : void {
  if (value < 0 || value > 1) {
    return;
  }

  gauge.querySelector(".gauge__fill").style.transform = `rotate(${
    value / 2
  }turn)`;
  gauge.querySelector(".gauge__cover").textContent = `${Math.round(
    value * 100
  )}%`;

  gauge.querySelector(".gauge__fill").style.background = '#2ecc71';

  if(value < .3) {
    gauge.querySelector(".gauge__fill").style.background = '#c62828';
  }

  if(value > .8) {
    gauge.querySelector(".gauge__fill").style.background = '#00c3e3';
  }

}

  constructor(public timersService : TimerServiceService) { }

  ngOnInit() {

    this.timersService.getChildren().subscribe(c => {
      this.children = c;
      this.selectedChild = c[0];
      this.timersService.getTimerValue().subscribe(v => {
        this.childrenTime = v;
        let filterchild = this.childrenTime.filter(i => i.name === this.selectedChild.name);
        this.timermili = filterchild[0].timer
        this.timer = this.timeToString(this.timermili);
        this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
        this.message = 'donnée reçue : ' + this.selectedChild.name + ' : ' + this.timeToString(this.timermili);
        if (this.timermili === 0) {this.timesUp = true}
      }, err => {
        this.message = 'erreur serveur : ' + err.message;
      });
    });

     this.gaugeElement = document.querySelector(".gauge");
      this.isPlaying = false;

  }

  public onChange(child): void {

        this.timesUp = false;
        this.hasChanged = false;
        this.isReading = false;
        this.isPlaying = false;
        this.timersService.getTimerValue().subscribe(v => {
    
          this.childrenTime = v;
            let filterchild = this.childrenTime.filter(i => i.name === this.selectedChild.name);
          this.timermili = filterchild[0].timer;
          this.timer = this.timeToString(this.timermili);
          this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
          this.message = 'donnée reçue : ' + this.selectedChild.name + ' : ' + this.timeToString(this.timermili);
          if (this.timermili === 0) {this.timesUp = true}
        }, err => {
          this.message = 'erreur serveur : ' + err.message;
        })
      } 

  public startReading(): void {
    this.hasChanged = true;
    this.isReading = true;
    this.timesUp = false;
    this.readingsub = this.second$.
    subscribe( tick => {
      this.timermili += 1000;
      if (this.timermili >= this.MAXTIMER) {this.timermili = this.MAXTIMER}
      this.timer = this.timeToString(this.timermili);
      this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
    });
  }

  public stopReading(): void {
    this.hasChanged = true;
    this.isReading = false;
    this.readingsub.unsubscribe();
  }

  public startPlaying(): void {
    this.hasChanged = true;
    this.isPlaying = true;
    this.isReading = false;
    this.playingsub = this.playseconds$.
    subscribe( tick => {
      this.timermili -=1000;
      if (this.timermili <= 0) {
        this.timermili = 0;
        this.timesUp = true;
        this.stopPlaying();
      }
      this.timer = this.timeToString(this.timermili);
      this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
    })
  }

  public stopPlaying(): void {
    this.hasChanged = true;
    this.isPlaying = false;
    this.playingsub.unsubscribe();
  }

  public smallPenalty(): void {
    this.timermili -= this.small * 60 * 1000;
    if (this.timermili <= 0 ) { 
      this.timermili = 0;
      this.timesUp = true;
     }
    this.timer = this.timeToString(this.timermili);
    this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
    this.hasChanged = true;
  }

  public bigPenalty(): void {
    this.timermili -= this.big * 60 * 1000;
    if (this.timermili <= 0 ) { 
      this.timermili = 0;
      this.timesUp = true;
     }
    this.timer = this.timeToString(this.timermili);
    this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
    this.hasChanged = true;
  }

  public resetTimer(): void {
    this.timesUp = false;
    this.timermili = 60 * 60 * 1000;
    this.timer = this.timeToString(this.timermili);
    this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
    this.hasChanged = true;
  }

  public saveTimer(): void {

    this.childrenTime.forEach(c => {if(c.id === this.selectedChild.id) c.timer = this.timermili})
    let data = JSON.stringify(this.childrenTime);
    console.log(data);
    this.timersService.setTimerValue(data).subscribe(v => {
      this.message = 'donnée enregistrée : ' + this.selectedChild.name + ' : ' + this.timeToString(this.timermili);
      this.hasChanged = false;
    }, err => {
      this.message = 'erreur d‘enregistrement des données ' + err.message;
    });
  }

  public timeToString(time: number): string {

    let hours = Math.floor(
      (time % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    let minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((time %(1000 * 60) / 1000));

    return  hours + 'h ' + minutes + 'm ' + seconds + 's';
  }

}
