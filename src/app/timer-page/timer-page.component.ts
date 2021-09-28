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
  {"id": 0, "name":"--", "timer": 3600000, "isReading": false, "isPlaying": false, "playingStart": 0, "readingStart": 0};
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

    // get the current gauge graphic from the DOM
    this.gaugeElement = document.querySelector(".gauge");

    // get current child from route parameter
    this.childID = parseInt(this.route.snapshot.paramMap.get('id'));

    // get children values from the server
      this.timersService.getTimerValue().subscribe(v => {
        this.childrenTime = v;

        v.forEach(c => {
          if(c.isPlaying || c.isReading) {
          // if another child is reading of playing, load this child instead
            this.selectedChild = c;
            this.childID = c.id;
          }
          // else set the current child to the ID from the route parameter.
          if(c.id === this.childID) {
            this.selectedChild = c;
          }
        });

        // set component values with selected child

        this.previousChild = this.selectedChild;
        this.timermili = this.selectedChild.timer;
        this.isReading = this.selectedChild.isReading;
        this.isPlaying = this.selectedChild.isPlaying;
        
        // Display Timer values and Gauge
        this.timer = this.timeToString(this.timermili);
        this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));
        
        // display success status or request.
        this.message = 'donnée reçue : ' + this.selectedChild.name + ' : ' + this.timeToString(this.timermili);
        
        // specific cases depending in the reveived values

        // time up for this child
        if (this.timermili === 0) {this.timesUp = true}

        // Max time for this child
        if (this.timermili === this.MAXTIMER) {this.isMaxTime = true;}

        // If child has started reading or playing on another client start the appropriate action on this client
        // data sync happens in the playing and reading methods.
        if(this.isPlaying) {this.startPlaying()}
        if(this.isReading) {this.startReading()}
      }, err => {
        // handle network errors with a simple information message.
        this.message = 'erreur serveur : ' + err.message;
      });
  }


  // reload function (NOT USED)
  public reload(): void {
    this.redirectTo(this.location.path());
  }

  // Function used to navigate to another child (each has it's own URL with ID parameter)
  public redirectTo(uri: string) {
    this.router.navigateByUrl('/', {skipLocationChange: true}).then(() =>
    this.router.navigate([decodeURIComponent(uri)]));
 }

 /* This function gets fresh data from the server to compare it to local data and detect any change
  To avoir complex conflict resolution / merge, any ongoing action (reading/playing) has priority
  Any action that was previously recorded must be updated before applying any new change. */

  public hasSomethingChanged(): void {
    // modifier detection flag
    let modif = false;

    // get fresh data from the server
    this.timersService.getTimerValue().subscribe(
      v => {
        v.forEach(c => {
          if (c.isReading || c.isPlaying) {
            // something is happening for another clid, reload
            window.alert('donnée pas à jour pour ' + c.name);
            this.redirectTo('/timer/'+ c.id);
            modif = true;
            return;
          }
          this.childrenTime.forEach(e => {
            if(e.name === c.name) {
              if(e.timer !== c.timer) {
                // you are not up to date, reload
                window.alert('donnée pas à jour pour ' + e.name);
                this.redirectTo('/timer/' + c.id);
                modif = true;
                return;
              }
            }
          });
        });
        if(!modif) {
        // No Changes detected, nothing to do
        return;
        }
      }
    );
  }

  // this Function handles the dropdown menu change events using 2-Way binding
  public onChange(value: any): void {

    // first detect server side if something has changed and ignore menu action if it's the case
    this.hasSomethingChanged();

    // special case in the menu to add a new child
    if(value === 'add_child') {

      // get child name through standard navigaator input
      // TODO : create popup component with a form
      let childname = window.prompt('Veuillez entrer le nom de l‘enfant :');
      if(childname !== null) {
      
        // create new child locally in the table
        this.childrenTime.push({
          name:childname, 
          id:this.childrenTime[this.childrenTime.length -1].id +1,
          timer:3600000,
          isReading: false,
          isPlaying:false,
          playingStart: 0,
          readingStart:0});

          // save data
          this.saveTimer();

          // refresh page to new child
          this.redirectTo('/timer/'+this.childrenTime.filter(c => c.name === childname)[0].id);
      
    } else this.redirectTo('/timer/'+this.childrenTime[this.childrenTime.length - 1].id);
    // if empty name redirect to the last child (for UX consistency with the dropdown)
    } else {
      // just load the selected child page
      this.redirectTo('/timer/'+this.selectedChild.id);
    }
    }

  // this function removes a child from the table and reloads data.
  // only called from the UI with the "Supprimer" (remove) button
  public removeChild(): void {
    
    // Ask for user confirmation using standard navigator component.
    if (window.confirm('êtes vous sûr de vouloir supprimer le compteur de '+ this.selectedChild.name + ' ?')) {
    this.childrenTime = this.childrenTime.filter(c => c.name !== this.selectedChild.name);

    // Save Data
    this.saveTimer();

    // refresh page to first child (default)
    this.redirectTo('/timer/'+this.childrenTime[0].id);
  }

  }

  // this is the reading function
  // reading increases the available gaming time by the equivalent of reading miliseconds
  public startReading(): void {

    // if reading starts on this client, start the reading process locally and inform the server
    if(this.selectedChild.readingStart === 0) {
      this.hasChanged = true;
      this.isReading = true;
      this.selectedChild.isReading = true;

      // saves the timestamp of the reading session start to sync other clients
      this.selectedChild.readingStart = Date.now();

      // Save Data
      this.saveTimer();
     }

    // change status
    this.hasChanged = true;

    // save value in history
    this.timermiliHistory.push(this.timermili);

    // reading interrupts playing session
    this.selectedChild.isPlaying = false;

    // keep track of the original timestamp for local display
    let originaltimer = this.timermili;

    this.timesUp = false;
    
    // use inteval observable to act each passing second
    this.readingsub = this.second$.
    subscribe( tick => {

      // calculate the difference between session start and current time every second
      this.timermili = originaltimer + (Date.now() -  this.selectedChild.readingStart);

      // check if time is maxed out (by config file MAX_TIMER value)
      if (this.timermili >= this.MAXTIMER) {
        this.timermili = this.MAXTIMER;
        this.isMaxTime = true;

        // Stop reading action when counter is full
        // but the child should keep reading ;-)
        this.stopReading();
      }

      // display current timer value
      this.timer = this.timeToString(this.timermili);
      this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));

      // every 10 seconds check if server is still sync (in case reading started or halted on a different client)
      if (Math.round(tick/10) === tick/10) {
        
        // check if reading has stopped server side

        this.timersService.getTimerValue().subscribe(v => {

          if(v.filter(i => i.name === this.selectedChild.name)[0].isReading === false) {
            this.timermili = v.filter(i => i.name === this.selectedChild.name)[0].timer;

            // set the timer to the updated value after the reading session
            this.timer = this.timeToString(this.timermili);
            this.setGaugeValue(this.gaugeElement, (this.timermili / this.MAXTIMER));

            // stop reading activity locally
            this.stopReading();
          }

        });


      }

    });

  }

  // this function stops reading action locally on the client and saves data.
  public stopReading(): void {

    // unsubscribe to the interval observable.
    this.readingsub.unsubscribe();

    // change status
    this.isReading = false;
    this.hasChanged = true;
    this.selectedChild.isReading = false;

    // reset the reading start session timestamp
    this.selectedChild.readingStart = 0;

    // save data
    this.saveTimer();
  }

  // This function handles playing activity
  // exact same implementation than Reading except that Playing DECREASES the timer value
  // Max reading time is replaced by 0 playing time left.
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

  // This function stops Playing activity
  // Same implementation than stopReading
  public stopPlaying(): void {

    this.playingsub.unsubscribe();
    this.isPlaying = false;
    this.hasChanged = true;
    this.selectedChild.isPlaying = false;
    this.selectedChild.playingStart = 0;
    this.saveTimer();
  }

  // This function decreases timer by a value set in the config file (small)
  // Stores previous values in history allowing for the cancel button to work
  // does not save data (to allow for erroneous input)
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

  // This function increases timer by a value set in the config file (small)
  // Stores previous values in history allowing for the cancel button to work
  // does not save data (to allow for erroneous input)
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


  // This function resets timer to 1 jour
  // Stores previous values in history allowing for the cancel button to work
  // does not save data (to allow for erroneous input)
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

  // This function reverts timer value to the previously stored value using a history table
  // TODO : check what should be the max size of this table not to crash client...
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

  // Saves data on the server
  // serializes the childrenTime table containing value for all children (only one has been modified)
  // calls the API on the server with a http POST request
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

  // This function is called using the manual "Enregistrer" (save) button
  // Same implementation than savetimer, but checks for moficiations before
  // combination of hassomethingchanged and savetimer
  public saveTime_withCheck(): void {

    let modif = false;
    // check server side
    this.timersService.getTimerValue().subscribe(
      
      v => {
        v.forEach(c => {
          if (c.isReading || c.isPlaying) {
            window.alert('donnée pas à jour pour ' + c.name);
            // something is happening for another child, reload
            this.redirectTo('/timer/'+ c.id);
            modif = true;
            return;
          }
          this.childrenTime.forEach(e => {
            if(e.name === c.name) {
              if(e.timer !== c.timer) {
                window.alert('donnée pas à jour pour ' + e.name);
                // you are not up to date, reload
                this.redirectTo('/timer/' + c.id);
                modif = true;
                return;
              }
            }
          });
        });
        if(!modif) {
        // save current value locally
    this.childrenTime.forEach(c => {if(c.id === this.selectedChild.id) c.timer = this.timermili})
        // nothing changed except local change, save data on the server
        let data = JSON.stringify(this.childrenTime);
        this.timersService.setTimerValue(data).subscribe(v => {
          this.message = 'donnée enregistrée : ' + this.selectedChild.name + ' : ' + this.timeToString(this.timermili);
          this.hasChanged = false;
          this.timermiliHistory = [];
        }, err => {
          this.message = 'erreur d‘enregistrement des données ' + err.message;
        });
      }
      }
    );
  }

  // Time formatting fucntion
  // transform millisecond timestamp into a readable sentence
  public timeToString(time: number): string {

    let hours = Math.floor(
      (time % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    let minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((time %(1000 * 60) / 1000));

    return  hours + 'h ' + minutes + 'm ' + seconds + 's';
  }

}
