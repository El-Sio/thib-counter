import { Component, OnInit } from '@angular/core';
import { interval } from 'rxjs';
import { AppInitServiceService } from '../app-init-service.service';
import { thibTimerValue } from '../data-model';
import { TimerServiceService } from '../timer-service.service';

@Component({
  selector: 'app-timer-page',
  templateUrl: './timer-page.component.html',
  styleUrls: ['./timer-page.component.css']
})

export class TimerPageComponent implements OnInit {

  public timer = '';
  public timermili = 0
  public timermiliHistory : number[] =[]
  public historyIndex = 0;
  public message = '';
  public hasChanged = false;
  public isReading = false;
  public timesUp = false;
  public isPlaying = false;
  public isMaxTime = false;
  public selectedChild: thibTimerValue = {"id": 0, "name":"--", "timer": 36000};
  public childrenTime: thibTimerValue[] = [];
  public previousChild: thibTimerValue;
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

  if(value < .25) {
    gauge.querySelector(".gauge__fill").style.background = '#c62828';
  }

  if(value >= .25 && value <= .4) {
    gauge.querySelector(".gauge__fill").style.background = '#d35400';
  }

  if(value > .8) {
    gauge.querySelector(".gauge__fill").style.background = '#00c3e3';
  }

}

  constructor(public timersService : TimerServiceService) { }

  ngOnInit() {
      this.timersService.getTimerValue().subscribe(v => {
        this.childrenTime = v;
        this.selectedChild = this.childrenTime[0];
        this.previousChild = this.selectedChild;
        this.timermili = this.selectedChild.timer;
        this.timer = this.timeToString(this.timermili);
        this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
        this.message = 'donnée reçue : ' + this.selectedChild.name + ' : ' + this.timeToString(this.timermili);
        if (this.timermili === 0) {this.timesUp = true}
        if (this.timermili === this.MAXTIMER) {this.isMaxTime = true;}
      }, err => {
        this.message = 'erreur serveur : ' + err.message;
      });

     this.gaugeElement = document.querySelector(".gauge");
      this.isPlaying = false;

  }

  public onChange(value: thibTimerValue): void {
      this.timesUp = false;
        this.hasChanged = false;
        this.timermiliHistory = [];
        this.isReading = false;
        this.isPlaying = false;
        this.selectedChild = value;
        this.timermili = this.selectedChild.timer;
          this.timer = this.timeToString(this.timermili);
          this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
          this.message = 'donnée reçue : ' + this.selectedChild.name + ' : ' + this.timeToString(this.timermili);
          if (this.timermili === 0) {this.timesUp = true}
          if (this.timermili === this.MAXTIMER) {this.isMaxTime = true;}
          this.previousChild = this.selectedChild;
    }

  public startReading(): void {
    this.hasChanged = true;
    this.timermiliHistory.push(this.timermili);
    this.isReading = true;
    this.timesUp = false;
    this.readingsub = this.second$.
    subscribe( tick => {
      this.timermili += 1000;
      if (this.timermili >= this.MAXTIMER) {
        this.timermili = this.MAXTIMER;
        this.isMaxTime = true;
        this.stopReading();
      }
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
    this.isMaxTime = false;
    this.hasChanged = true;
    this.timermiliHistory.push(this.timermili);
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
    this.isMaxTime = false;
    this.timermiliHistory.push(this.timermili);
    this.timermili -= this.small * 60 * 1000;
    if (this.timermili <= 0 ) { 
      this.timermili = 0;
      this.timesUp = true;
     }
    this.timer = this.timeToString(this.timermili);
    this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
    this.hasChanged = true;
  }

  public smallBonus(): void {
    this.timesUp = false;
    this.timermiliHistory.push(this.timermili);
    this.timermili += this.small * 60 * 1000;
    if (this.timermili >= this.MAXTIMER ) { 
      this.timermili = this.MAXTIMER;
      this.isMaxTime = true;
     }
    this.timer = this.timeToString(this.timermili);
    this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
    this.hasChanged = true;
  }

  public resetTimer(): void {
    this.timesUp = false;
    this.isMaxTime = false;
    this.timermiliHistory.push(this.timermili);
    this.timermili = 60 * 60 * 1000;
    this.timer = this.timeToString(this.timermili);
    this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
    this.hasChanged = true;
  }

  public cancelChange(): void {
    this.historyIndex = this.timermiliHistory.length;
    if (this.timermiliHistory.length !==0 ) {
      this.timermili = this.timermiliHistory[this.historyIndex - 1];
      if (this.timermili <= 0) { this.timesUp = true;}
      if (this.timermili > 0) { this.timesUp = false;}
      this.timer = this.timeToString(this.timermili);
      this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
      this.timermiliHistory = this.timermiliHistory.slice(0,this.historyIndex-1);
      this.historyIndex -=1;
    }
    if (this.timermiliHistory.length ===0 ) {
      this.hasChanged = false;
    }
  }

  public saveTimer(): void {

    this.childrenTime.forEach(c => {if(c.id === this.selectedChild.id) c.timer = this.timermili})
    let data = JSON.stringify(this.childrenTime);
    this.timersService.setTimerValue(data).subscribe(v => {
      this.message = 'donnée enregistrée : ' + this.selectedChild.name + ' : ' + this.timeToString(this.timermili);
      this.hasChanged = false;
      this.timermiliHistory = [];
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
