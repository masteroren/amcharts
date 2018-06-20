import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineComponent } from './timeline.component';
import { AmChartsService } from '@amcharts/amcharts3-angular';
import { TimelineService } from './services/timeline.service';

@NgModule({
  imports: [
    CommonModule,
  ],
  declarations: [TimelineComponent],
  exports: [TimelineComponent],
  providers: [AmChartsService, TimelineService]
})
export class TimelineModule { }
