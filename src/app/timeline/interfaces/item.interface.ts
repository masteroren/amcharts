import { IDateSegment } from "./date-segment.interface";

export interface IItem {
    ID: number;
    type: string;
    date: number;
    data: IDateSegment;
}

export declare type Items = IItem[];