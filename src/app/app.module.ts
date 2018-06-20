import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';

import { TimelineModule } from './timeline/timeline.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    TimelineModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
