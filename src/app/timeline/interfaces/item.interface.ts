import { IDateSegment } from "./date-segment.interface";

export interface IItem {
    id: number;
    type: string;
    date: number;
    data: IDateSegment;
}

export declare type Items = IItem[];