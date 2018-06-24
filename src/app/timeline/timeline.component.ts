import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { INode } from './interfaces/node.interface';
import { AmChartsService } from '@amcharts/amcharts3-angular';
import * as moment from 'moment';
import { IItem } from './interfaces/item.interface';
import { IDataProviderItem } from './interfaces/data-provider.interface';
import { TimelineService } from './services/timeline.service';
import { IDateSegment } from './interfaces/date-segment.interface';
import { ClassGetter } from '@angular/compiler/src/output/output_ast';
import { IFallbackView } from './interfaces/fallback-item.interface';

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
    { timeFrame: TimeFrames.hours, format: 'DD-MM-YYYY hh:ss' }
  ]
  private timeFrame: TimeFrames = TimeFrames.years;

  @Output() public onBarClick = new EventEmitter();
  @Output() public onFilter = new EventEmitter();

  private chart: any;
  private items: IItem[] = [];

  private fallbackViews = {
    year: null,
    month: null,
    week: null,
    day: null,
    hour: null,
  }

  constructor(private AmCharts: AmChartsService, private timelineService: TimelineService) { }

  ngOnInit() {

    this.timelineService.getNodes().subscribe((nodes: INode[]) => {

      this.nodes = Object.entries(nodes).map(x => x[1]);
      // console.log('nodes => ', this.nodes);

      this.prepareDataProvider();

      this.chart = this.AmCharts.makeChart("chartdiv", {
        type: "serial",
        theme: "light",
        chartScrollbar: {
          autoGridCount: true,
          graph: "g1",
          scrollbarHeight: 40,
          updateOnReleaseOnly: true
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
            event: "rendered",
            method: (e) => {
              console.log('rendered');
            }
          },
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

    this.items = this.initTimelineItems();
    const _xItems = this.getXItems(this.items);
    this.initDataProvider(_xItems);
    this.setTimelineValues(this.items);

  }

  private initTimelineItems(): IItem[] {

    let _items: IItem[] = [];

    this.nodes.forEach((node: INode) => {

      const dateAttr = node.Attributes.find(x => x.Name === 'LaTimeField');

      if (dateAttr && dateAttr.Value) {
        const dateValue = new Date(dateAttr.Value * 1000);

        _items = [..._items, {
          ID: node.ID,
          type: node.TypeID,
          date: dateAttr.Value,
          data: {
            year: dateValue.getFullYear(),
            month: dateValue.getMonth(),
            week: moment(dateValue).week(),
            day: dateValue.getDate(),
            hour: dateValue.getHours(),
            minute: dateValue.getMinutes(),
            second: dateValue.getSeconds()
          }
        }]
      }

    })

    _items = _items.sort((a, b) => {
      return a.date - b.date;
    });

    // console.log('timeline items => ', _items);

    return _items;

  }

  private initDataProvider(xItems: IDateSegment[]) {

    let _dataProvider: IDataProviderItem[] = [];

    xItems.forEach((xItem: IDateSegment) => {

      switch (this.timeFrame) {
        case TimeFrames.weeks:

          {
            const date = new Date(xItem.year, xItem.month, xItem.day, xItem.hour, xItem.minute, xItem.second);
            const dateValue = date.getTime();

            _dataProvider = [..._dataProvider, {
              key: moment(date).format(this.timeFrameFormats[TimeFrames.months].format) + ' ' + xItem.week,
              value: 0,
              data: xItem,
              date: dateValue
            }]

          }

          break
        default:

          {
            const date = new Date(xItem.year, xItem.month, xItem.day, xItem.hour, xItem.minute, xItem.second);
            const dateValue = date.getTime();

            _dataProvider = [..._dataProvider, {
              key: moment(date).format(this.timeFrameFormats[this.timeFrame].format),
              value: 0,
              data: xItem,
              date: dateValue
            }]
          }

          break;
      }

    });

    this.dataProvider = _dataProvider;

    // console.log('data provider => ', this.dataProvider);

    if (this.chart) {
      this.chart.dataProvider = this.dataProvider;
      this.chart.validateData();
    }
  }

  private setTimelineValues(items: IItem[]) {

    let dpItem;

    items.forEach((item: IItem) => {
      switch (this.timeFrame) {
        case TimeFrames.years:
          dpItem = this.dataProvider.find((dpi: IDataProviderItem) => dpi.data.year === item.data.year);
          break;
        case TimeFrames.months:
          dpItem = this.dataProvider.find((dpi: IDataProviderItem) =>
            dpi.data.year === item.data.year &&
            dpi.data.month === item.data.month);
          break;
        case TimeFrames.weeks:
          dpItem = this.dataProvider.find((dpi: IDataProviderItem) =>
            dpi.data.year === item.data.year &&
            dpi.data.month === item.data.month &&
            dpi.data.week === item.data.week);
          break;
        case TimeFrames.days:
          dpItem = this.dataProvider.find((dpi: IDataProviderItem) =>
            dpi.data.year === item.data.year &&
            dpi.data.month === item.data.month &&
            dpi.data.day === item.data.day);
          break;
        case TimeFrames.hours:
          dpItem = this.dataProvider.find((dpi: IDataProviderItem) =>
            dpi.data.year === item.data.year &&
            dpi.data.month === item.data.month &&
            dpi.data.day === item.data.day &&
            dpi.data.hour === item.data.hour);
          break;
      }

      if (dpItem) {
        dpItem.value += 1;
        if (!dpItem.nodes) dpItem.nodes = [];
        dpItem.nodes.push(item)
      }
    })

    // console.log('data provider => ', this.dataProvider);


    if (this.chart) {
      this.chart.dataProvider = this.dataProvider;
      this.chart.validateData();
    }

  }

  private getXItems(items: IItem[]): IDateSegment[] {

    let dateSegments: IDateSegment[] = [];

    switch (this.timeFrame) {
      case TimeFrames.years:

        {
          const startYear = items[0].data.year;
          const endYear = items[items.length - 1].data.year;

          for (let year = startYear; year < endYear; year++) {
            dateSegments.push({
              year: year,
              month: 0,
              day: 1,
              hour: 0,
              minute: 0,
              second: 0
            });
          }

          dateSegments.push({
            year: endYear,
            month: 11,
            day: moment(items[items.length - 1].date).daysInMonth(),
            hour: 23,
            minute: 59,
            second: 59
          });
        }

        break
      case TimeFrames.months:

        {
          const startYear = items[0].data.year;
          const endYear = items[items.length - 1].data.year;
          for (let year = startYear; year <= endYear; year++) {
            for (let month = 0; month <= 11; month++) {
              dateSegments.push({
                year: year,
                month: month,
                day: 1,
                hour: null,
                minute: null,
                second: null
              });
            }
          }
        }

        break;
      case TimeFrames.weeks:

        {

          const year = items[0].data.year;
          const month = items[0].data.month;
          const startWeek = items[0].data.week

          let week = startWeek;

          for (let i = 1; i <= 4; i++ , week++) {
            dateSegments.push({
              year: year,
              month: month,
              week: week,
              day: 1,
              hour: null,
              minute: null,
              second: null
            });
          }
        }

        break;

      case TimeFrames.days:

        {
          const year = items[0].data.year;
          const month = items[0].data.month;
          const startDay = items[0].data.day;
          const endDay = items[items.length - 1].data.day;

          for (let day = startDay; day <= endDay; day++) {
            dateSegments.push({
              year: year,
              month: month,
              day: day,
              hour: null,
              minute: null,
              second: null
            });
          }
        }

        break;

      case TimeFrames.hours:

        {
          const year = items[0].data.year;
          const month = items[0].data.month;
          const day = items[0].data.day;

          for (let hour = 1; hour <= 24; hour++) {
            dateSegments.push({
              year: year,
              month: month,
              day: day,
              hour: hour,
              minute: null,
              second: null
            });
          }
        }

        break;
    }

    // console.log('xItems => ', dateSegments);

    return dateSegments;

  }

  private getItems(from: number, to: number): IItem[] {

    let _items = this.items.filter(x => { return x.date * 1000 >= from && x.date * 1000 <= to });

    _items = _items.sort((a, b) => {
      return a.date - b.date;
    });

    // console.log('filterd items => ', _items);

    return _items;
  }

  private handleZoom(e) {

    const fromIndex = e.startIndex;
    const toIndex = e.endIndex;

    const fromData: IDateSegment = e.chart.dataProvider[fromIndex].data;
    const toData: IDateSegment = e.chart.dataProvider[toIndex].data;

    switch (this.timeFrame) {
      case TimeFrames.years:

        {

          let from = new Date(fromData.year, 0, 1, 0, 0, 0).getTime();
          let to = new Date(toData.year, 11, 31, 23, 59, 59).getTime();
          let durationInMonths = Math.floor(moment.duration({ from: from, to: to }, 'd').asMonths());

          // console.log('durationInMonths => ', durationInMonths);

          if (durationInMonths === 24) {

            this.fallbackViews.year = {
              dataProvider: this.dataProvider,
              timeFrame: this.timeFrame,
              fromIndex: fromIndex,
              toIndex: toIndex
            }

            this.timeFrame = TimeFrames.months;
            this.drawChart(from, to);

          }

        }

        break;

      case TimeFrames.months:

        {

          let from = new Date(fromData.year, fromData.month, 1, 0, 0, 0).getTime();
          let daysInMonth = moment(new Date(toData.year, toData.month)).daysInMonth();
          let to = new Date(toData.year, toData.month, daysInMonth, 23, 59, 59).getTime();

          let durationInWeeks = Math.floor(moment.duration({ from: from, to: to }, 'd').asWeeks());

          // console.log('durationInWeeks => ', durationInWeeks);

          if (durationInWeeks <= 12) {

            this.fallbackViews.month = {
              dataProvider: this.dataProvider,
              timeFrame: this.timeFrame,
              fromIndex: fromIndex,
              toIndex: toIndex
            }

            this.timeFrame = TimeFrames.weeks;
            this.drawChart(from, to);
          }

        }

        break;

      case TimeFrames.weeks:

        {

          if (toIndex - fromIndex === 1) {

            this.fallbackViews.week = {
              dataProvider: this.dataProvider,
              timeFrame: this.timeFrame,
              fromIndex: fromIndex,
              toIndex: toIndex
            }

            let from = new Date(fromData.year, fromData.month, fromData.day, 0, 0, 0).getTime();
            let to = moment(from).add(8, 'd').toDate().getTime();
            this.timeFrame = TimeFrames.days;
            this.drawChart(from, to);
          }

        }

        break;

      case TimeFrames.days:

        {

          let from = new Date(fromData.year, fromData.month, fromData.day, 0, 0, 0).getTime();
          let to = new Date(toData.year, toData.month, toData.day, 23, 59, 59).getTime();

          let durationInHours = Math.floor(moment.duration({ from: from, to: to }, 'h').asHours());

          if (durationInHours <= 24) {

            this.fallbackViews.day = {
              dataProvider: this.dataProvider,
              timeFrame: this.timeFrame,
              fromIndex: fromIndex,
              toIndex: toIndex
            }

            this.timeFrame = TimeFrames.hours;
            this.drawChart(from, to);
          }

        }

        break;
    }

  }

  private drawChart(from: number, to: number) {

    const _items = this.getItems(from, to);
    const _xValues = this.getXItems(_items);
    this.initDataProvider(_xValues);
    this.setTimelineValues(_items);

  }

  public backToPrevView() {
    console.log('fallbackView => ', this.fallbackViews);

    let fallbackView;

    switch (this.timeFrame) {
      case TimeFrames.months:
        fallbackView = this.fallbackViews.year;
        break;
    }

    if (fallbackView) {
      this.timeFrame = fallbackView.timeFrame;
      this.chart.dataProvider = fallbackView.dataProvider;
      this.chart.validateData();
      // this.chart.zoomToIndexes(fallbackView.fromIndex, fallbackView.toIndex);
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.AmCharts.destroyChart(this.chart);
    }
  }

}
