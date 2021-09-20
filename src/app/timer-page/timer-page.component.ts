import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { interval } from 'rxjs';
import { AppInitServiceService } from '../app-init-service.service';
import { thibTimerValue } from '../data-model';
import { TimerServiceService } from '../timer-service.service';

@Component({
  selector: 'app-timer-page',
  templateUrl: './timer-page.component.html',
  styleUrls: ['./timer-page.component.css']
})

export class TimerPageComponent implements OnInit, OnDestroy {

  public timer = '';
  public timermili = 0
  public childID = 0;
  public timermiliHistory : number[] =[]
  public historyIndex = 0;
  public message = '';
  public hasChanged = false;
  public isReading = false;
  public timesUp = false;
  public isPlaying = false;
  public isMaxTime = false;
  public selectedChild: thibTimerValue = 
  {"id": 0, "name":"--", "timer": 36000, "isReading": false, "isPlaying": false, "playingStart": 0, "readingStart": 0};
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
  mySubscription: any;

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

  constructor(public timersService : TimerServiceService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location) { 

      this.router.routeReuseStrategy.shouldReuseRoute = function () {
        return false;
      };
      this.mySubscription = this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          // Trick the Router into believing it's last link wasn't previously loaded
          this.router.navigated = false;
        }
      });
    }

    ngOnDestroy(): void {
      if (this.mySubscription) {
        this.mySubscription.unsubscribe();
      }
    }

  ngOnInit() {

    this.childID = parseInt(this.route.snapshot.paramMap.get('id'));
    console.log(this.childID);
      this.timersService.getTimerValue().subscribe(v => {
        this.childrenTime = v;
        v.forEach(c => {
          if(c.isPlaying || c.isReading) {
            console.log('reading or playing elsewhere');
            this.selectedChild = c;
            this.childID = c.id;
          }
          if(c.id === this.childID) {
            console.log('found chlid : ', c.name);
            this.selectedChild = c;
          }
        });
        this.previousChild = this.selectedChild;
        this.timermili = this.selectedChild.timer;
        this.isReading = this.selectedChild.isReading;
        this.isPlaying = this.selectedChild.isPlaying;
        this.timer = this.timeToString(this.timermili);
        this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
        this.message = 'donnée reçue : ' + this.selectedChild.name + ' : ' + this.timeToString(this.timermili);
        if (this.timermili === 0) {this.timesUp = true}
        if (this.timermili === this.MAXTIMER) {this.isMaxTime = true;}
        if(this.isPlaying) {this.startPlaying()}
        if(this.isReading) {this.startReading()}
      }, err => {
        this.message = 'erreur serveur : ' + err.message;
      });

     this.gaugeElement = document.querySelector(".gauge");
      this.isPlaying = false;

  }


  public reload(): void {
    this.redirectTo(this.location.path());
  }

  public redirectTo(uri: string) {
    this.router.navigateByUrl('/', {skipLocationChange: true}).then(() =>
    this.router.navigate([decodeURIComponent(uri)]));
 }

  public hasSomethingChanged(): void {
    this.timersService.getTimerValue().subscribe(
      v => {
        v.forEach(c => {
          if (c.isReading || c.isPlaying) {
            // something is happening for another clid, reload
            this.redirectTo('/timer/'+ c.id);
          }
          this.childrenTime.forEach(e => {
            if(e.name === c.name) {
              if(e.timer !== c.timer) {
                // you are not up to date, reload
                this.redirectTo('/timer/' + c.id);
              }
            }
          });
        })

      }
    );
  }

  public onChange(value: any): void {

    this.hasSomethingChanged();

    if(value === 'add_child') {

      let childname = window.prompt('Veuillez entrer le nom de l‘enfant :');
      if(childname !== null) {
      
        this.childrenTime.push({
          name:childname, 
          id:Math.round(Math.random()*100 + 5), 
          timer:3600000,
          isReading: false,
          isPlaying:false,
          playingStart: 0,
          readingStart:0});
      this.selectedChild = this.childrenTime.filter(c => c.name === childname)[0];
      this.saveTimer();
      this.redirectTo('/timer/'+this.selectedChild.id);
      
    } else this.redirectTo('/timer/'+this.childrenTime[this.childrenTime.length - 1].id);
    } else {

      this.redirectTo('/timer/'+this.selectedChild.id);
      /*
        this.timesUp = false;
        this.hasChanged = false;
        this.selectedChild = value;
        this.timermiliHistory = [];
        this.isReading = this.selectedChild.isReading;
        this.isPlaying = this.selectedChild.isPlaying;
        this.timermili = this.selectedChild.timer;
          this.timer = this.timeToString(this.timermili);
          this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
          this.message = 'donnée reçue : ' + this.selectedChild.name + ' : ' + this.timeToString(this.timermili);
          if (this.timermili === 0) {this.timesUp = true}
          if (this.timermili === this.MAXTIMER) {this.isMaxTime = true;}
          this.previousChild = this.selectedChild;
          if(this.isPlaying) {this.startPlaying()}
          if(this.isReading) {this.startReading()} */
    }
    }

  public removeChild(): void {
    if (window.confirm('êtes vous sûr de vouloir supprimer le compteur de '+ this.selectedChild.name + ' ?')) {
    this.childrenTime = this.childrenTime.filter(c => c.name !== this.selectedChild.name);
    this.saveTimer();
    this.redirectTo('/timer/'+this.childrenTime[0].id);
  }

  }

  public startReading(): void {

    if(this.selectedChild.readingStart === 0) {
      this.hasChanged = true;
      this.isReading = true;
      this.selectedChild.isReading = true;
      this.selectedChild.readingStart = Date.now();
      this.saveTimer();
     }

    this.hasChanged = true;
    this.timermiliHistory.push(this.timermili);
    this.selectedChild.isPlaying = false;
    let originaltimer = this.timermili;
    this.timesUp = false;
    this.readingsub = this.second$.
    subscribe( tick => {

      this.timermili = originaltimer + (Date.now() -  this.selectedChild.readingStart);
      if (this.timermili >= this.MAXTIMER) {
        this.timermili = this.MAXTIMER;
        this.isMaxTime = true;
        this.stopReading();
      }
      this.timer = this.timeToString(this.timermili);
      this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));

      if (Math.round(tick/10) === tick/10) {
        
        // check if reading has stopped server side

        this.timersService.getTimerValue().subscribe(v => {

          if(v.filter(i => i.name === this.selectedChild.name)[0].isReading === false) {
            this.timermili = v.filter(i => i.name === this.selectedChild.name)[0].timer;
            this.timer = this.timeToString(this.timermili);
            this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
            this.stopReading();
          }

        });


      }

    });

  }

  public stopReading(): void {

    this.readingsub.unsubscribe();
    this.isReading = false;
    this.hasChanged = true;
    this.selectedChild.isReading = false;
    this.selectedChild.readingStart = 0;
    this.saveTimer();
  }

  public startPlaying(): void {

    if(this.selectedChild.playingStart === 0) {
      this.hasChanged = true;
      this.isPlaying = true;
      this.selectedChild.isPlaying = true;
      this.selectedChild.playingStart = Date.now();
      this.saveTimer();
    }

    this.isMaxTime = false;
    this.hasChanged = true;
    this.timermiliHistory.push(this.timermili);
    let originaltimer = this.timermili;
    this.selectedChild.isReading = false;
    this.playingsub = this.playseconds$.
    subscribe( tick => {
      this.timermili = originaltimer - (Date.now() - this.selectedChild.playingStart);
      if (this.timermili <= 0) {
        this.timermili = 0;
        this.timesUp = true;
        this.stopPlaying();
      }
      this.timer = this.timeToString(this.timermili);
      this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));

      if (Math.round(tick/10) === tick/10) {
        
        // check if playing has stopped server side

        this.timersService.getTimerValue().subscribe(v => {

          if(v.filter(i => i.name === this.selectedChild.name)[0].isPlaying === false) {
            this.timermili = v.filter(i => i.name === this.selectedChild.name)[0].timer;
            this.timer = this.timeToString(this.timermili);
            this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
            this.stopPlaying();
          }

        });


      }


    })
  }

  public stopPlaying(): void {

    this.playingsub.unsubscribe();
    this.isPlaying = false;
    this.hasChanged = true;
    this.selectedChild.isPlaying = false;
    this.selectedChild.playingStart = 0;
    this.saveTimer();
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
    this.selectedChild.isPlaying = false;
    this.isPlaying = false;
    this.isReading = false;
    this.selectedChild.isReading = false;
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
