/**
 * Google Sheets-specific TypeScript types
 */

export interface IGridRange {
  sheetId: number;
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}

export interface INamedRange {
  namedRangeId: string;
  name: string;
  range?: IGridRange;
}

export interface ISheet {
  properties: {
    sheetId: number;
    title: string;
    index: number;
    sheetType?: string;
    gridProperties?: {
      rowCount?: number;
      columnCount?: number;
      frozenRowCount?: number;
      frozenColumnCount?: number;
    };
  };
}

export interface IGoogleSpreadsheet {
  spreadsheetId: string;
  properties?: {
    title?: string;
    locale?: string;
    timeZone?: string;
  };
  sheets?: ISheet[];
  namedRanges?: INamedRange[];
  spreadsheetUrl?: string;
}

export interface ISheetValues {
  range?: string;
  majorDimension?: string;
  values?: any[][];
}

export interface ISheetUpdateResponse {
  spreadsheetId: string;
  updatedRange?: string;
  updatedRows?: number;
  updatedColumns?: number;
  updatedCells?: number;
}

export interface ISheetAppendResponse {
  spreadsheetId: string;
  tableRange?: string;
  updates?: ISheetUpdateResponse;
}

export interface IBatchGetResponse {
  spreadsheetId: string;
  valueRanges?: ISheetValues[];
}

export interface IBatchUpdateResponse {
  spreadsheetId: string;
  totalUpdatedRows?: number;
  totalUpdatedColumns?: number;
  totalUpdatedCells?: number;
  totalUpdatedSheets?: number;
  responses?: ISheetUpdateResponse[];
}
