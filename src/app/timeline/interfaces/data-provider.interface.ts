import { Items } from "./item.interface";
import { IDateSegment } from "./date-segment.interface";

export interface IDataProviderItem {
    key: string;
    value: number;
    data: IDateSegment;
    nodes?: Items;
    date: number;
  }