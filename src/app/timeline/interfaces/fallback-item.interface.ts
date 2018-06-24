import { IDataProviderItem } from "./data-provider.interface";

export interface IFallbackView {
    dataProvider: IDataProviderItem[],
    timeFrame: number,
    fromIndex: number;
    toIndex: number;
}