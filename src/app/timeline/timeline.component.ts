import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { INode } from './interfaces/node.interface';
import { AmChartsService } from '@amcharts/amcharts3-angular';
import * as moment from 'moment';
import { IItem } from './interfaces/item.interface';
import { IDataProviderItem } from './interfaces/data-provider.interface';
import { TimelineService } from './services/timeline.service';

enum TimeFrames {
  years,
  months,
  weeks,
  days,
  hours
}

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit {

  private nodes: INode[] = [];
  private dataProvider: IDataProviderItem[] = [];
  private breakPoints = [
    { from: 'hours', value1: 24, to: 'days', value2: 7 },
    { from: 'days', value1: 7, to: 'weeks', value2: 12 },
    { from: 'weeks', value1: 12, to: 'months', value2: 24 },
    { from: 'months', value1: 24, to: 'year', value2: 5 }
  ]
  private timeFrameFormats = [
    { timeFrame: TimeFrames.years, format: 'YYYY' },
    { timeFrame: TimeFrames.months, format: 'MM-YYYY' },
    { timeFrame: TimeFrames.weeks, format: 'MM-YYYY ww' },
    { timeFrame: TimeFrames.days, format: 'DD-MM-YYYY' },
    { timeFrame: TimeFrames.hours, format: 'DD-MM-YYYY hh:ss' },
  ]
  private timeFrame: TimeFrames = TimeFrames.years;

  @Output() public onBarClick = new EventEmitter();
  @Output() public onFilter = new EventEmitter();

  private chart: any;
  private minRange: number = 0;
  private maxRange: number = 0;

  constructor(private AmCharts: AmChartsService, private timelineService: TimelineService) { }

  ngOnInit() {

    this.timelineService.getNodes().subscribe((nodes: INode[]) => {

      this.nodes = Object.entries(nodes).map(x => x[1]);
      console.log(this.nodes);

      this.prepareDataProvider();

      this.chart = this.AmCharts.makeChart("chartdiv", {
        type: "serial",
        theme: "light",
        chartScrollbar: {
          autoGridCount: true,
          graph: "g1",
          scrollbarHeight: 40
        },
        dataProvider: this.dataProvider,
        mouseWheelZoomEnabled: true,
        valueAxes: [{
          gridColor: "#FFFFFF",
          gridAlpha: 0.2,
          dashLength: 0
        }],
        gridAboveGraphs: true,
        startDuration: 1,
        graphs: [{
          balloonText: "[[category]]: <b>[[value]]</b>",
          fillAlphas: 0.8,
          lineAlpha: 0.2,
          type: "column",
          valueField: "value"
        }],
        chartCursor: {
          categoryBalloonEnabled: false,
          cursorAlpha: 0,
          zoomable: false
        },
        categoryField: "key",
        categoryAxis: {
          gridPosition: "middle",
          gridAlpha: 0.1,
          tickPosition: "middle",
          tickLength: 10,
          labelRotation: 45
        },
        export: {
          enabled: true
        },
        listeners: [
          {
            event: "clickGraphItem",
            method: (e) => {
              this.onBarClick.emit(e.item.dataContext);
            }
          },
          {
            event: "zoomed",
            method: (e) => {

              this.handleZoom(e);

              this.onFilter.emit({
                startIndex: e.startIndex,
                startValue: e.startValue,
                endIndex: e.endIndex,
                endValue: e.endValue
              });
            }
          }
        ]

      });
    })

  }

  prepareDataProvider() {
    this.setTimelineItems();
  }

  private setTimelineItems() {
    let items: IItem[] = [];

    this.nodes.forEach((node: INode) => {

      const dateAttr = node.Attributes.find(x => x.Name === 'LaTimeField');
      if (dateAttr && dateAttr.Value) {
        const dateValue = new Date(dateAttr.Value * 1000);

        items = [...items, {
          id: node.ID,
          type: node.TypeID,
          date: dateAttr.Value,
          data: {
            year: dateValue.getFullYear(),
            month: dateValue.getMonth(),
            day: dateValue.getDate(),
            dayOfWeek: dateValue.getDay(),
            hour: ((hour) => {
              return hour;
            })(dateValue.getHours()),
            minutes: dateValue.getMinutes(),
            seconds: dateValue.getSeconds()
          }
        }]

        if (this.minRange === 0 && this.maxRange === 0) {
          this.minRange = this.maxRange = dateAttr.Value;
        }

        if (dateAttr.Value < this.minRange) {
          this.minRange = dateAttr.Value;
        }

        if (dateAttr.Value > this.maxRange) {
          this.maxRange = dateAttr.Value;
        }
      }

    })

    // sort items
    items = items.sort((a, b) => {
      return a.date - b.date;
    });

    console.log('items => ', items);
    this.minRange *= 1000;
    this.maxRange *= 1000;
    console.log('min => ', this.minRange);
    console.log('max => ', this.maxRange);

    this.setTimelineRange();
    this.setTimelineValues(items);
  }

  private setTimelineRange() {
    const second = 1000;
    const minute = second * 60;
    const hour = minute * 60;
    const day = hour * 24;
    const week = day * 7;
    const year = week * 52;

    let incrementBy = year;

    for (let start = this.minRange; start <= this.maxRange; start += incrementBy) {

      let date = moment(start).toDate();

      this.dataProvider = [...this.dataProvider, {
        key: moment(start).format(this.timeFrameFormats[this.timeFrame].format),
        value: 0,
        data: {
          year: date.getFullYear(),
          month: date.getMonth(),
          day: date.getDate(),
          dayOfWeek: date.getDay(),
          hour: ((hour) => {
            return hour;
          })(date.getHours()),
          minutes: date.getMinutes(),
          seconds: date.getSeconds()
        }
      }]

    }

    console.log('dataProvider => ', this.dataProvider);
  }

  private setTimelineValues(items: IItem[]) {
    items.forEach((item: IItem) => {
      let dpItem = this.dataProvider.find((dpItem: IDataProviderItem) => dpItem.data.year === item.data.year);
      if (dpItem) {
        dpItem.value += 1;
        if (!dpItem.nodes) dpItem.nodes = [];
        dpItem.nodes.push(item)
      }
    })
  }

  private updateTimelineRange() {
    const second = 1000;
    const minute = second * 60;
    const hour = minute * 60;
    const day = hour * 24;
    const week = day * 7;
    const year = week * 52;

    let incrementBy = year;

    for (let start = this.minRange; start <= this.maxRange; start += week) {

      let date = moment(start).toDate();

      this.dataProvider = [...this.dataProvider, {
        key: moment(start).format(this.timeFrameFormats[this.timeFrame].format),
        value: 0,
        data: {
          year: date.getFullYear(),
          month: date.getMonth(),
          day: date.getDate(),
          dayOfWeek: date.getDay(),
          hour: ((hour) => {
            return hour;
          })(date.getHours()),
          minutes: date.getMinutes(),
          seconds: date.getSeconds()
        }
      }]

    }

    // console.log('dataProvider => ', this.dataProvider);
    if (this.chart) {
      // this.chart.dataProvider = this.dataProvider;
    }
  }

  private handleZoom(e) {
    const startIndex = e.startIndex;
    const startValue = e.startValue;
    const endIndex = e.endIndex;
    const endValue = e.endValue;

    switch (this.timeFrame) {
      case TimeFrames.years:
        if (endIndex - startIndex === 2) {
          this.timeFrame = TimeFrames.months;
        }
        break;
      // case TimeFrames.months:
      //   if (endIndex - startIndex === 1) {
      //     this.timeFrame = TimeFrames.weeks;
      //   }
      //   if (endIndex - startIndex > 24) {
      //     this.timeFrame = TimeFrames.years;
      //   }
      //   break;
      // case TimeFrames.weeks:
      //   if (endIndex - startIndex === 7) {
      //     this.timeFrame = TimeFrames.days;
      //   }
      //   break;
      // case TimeFrames.days:
      //   if (endIndex - startIndex === 2) {
      //     this.timeFrame = TimeFrames.hours;
      //   }
      //   break;
    }

    console.log(this.timeFrame);
    this.updateTimelineRange();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.AmCharts.destroyChart(this.chart);
    }
  }

}
