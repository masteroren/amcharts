import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  barClicked(e) {
    console.log('clicked', e);
  }

  timeLineFiltered(e) {
    console.log('filtered', e);
  }
}