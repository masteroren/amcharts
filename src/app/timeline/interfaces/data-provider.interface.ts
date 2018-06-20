import { IDateSegment } from "./date-segment.interface";
import { Items } from "./item.interface";

export interface IDataProviderItem {
    key: string;
    value: number;
    data: IDateSegment;
    nodes?: Items;
  }