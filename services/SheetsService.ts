import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import { google } from 'googleapis';
import {
  IGoogleSpreadsheet,
  ISheetValues,
  ISheetUpdateResponse,
  ISheetAppendResponse,
  IBatchGetResponse,
  IBatchUpdateResponse,
  INamedRange,
} from '../types/sheets.types';

@service({
  id: 'google.SheetsService@1.0.0',
  name: 'SheetsService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google Sheets API operations service',
  serviceType: 'data',
  lifeCycle: 'singleton',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
  ],
})
class SheetsService implements Reactory.Service.IReactoryService {
  name: string = 'SheetsService';
  nameSpace: string = 'google';
  version: string = '1.0.0';
  context: Reactory.Server.IReactoryContext;

  constructor(
    _props: Reactory.Service.IReactoryServiceProps,
    context: Reactory.Server.IReactoryContext
  ) {
    this.context = context;
  }

  private get authService(): any {
    return this.context.getService('google.GoogleAuthService@1.0.0');
  }

  private getUserId(): string {
    return String(this.context.user?._id);
  }

  private async getClient() {
    const userId = this.getUserId();
    const authClient = await this.authService.getAuthorizedClient(userId);
    return google.sheets({ version: 'v4', auth: authClient });
  }

  async getSpreadsheet(spreadsheetId: string): Promise<IGoogleSpreadsheet> {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.get({ spreadsheetId });
    return res.data as IGoogleSpreadsheet;
  }

  async createSpreadsheet(title: string, sheetTitles: string[] = []): Promise<IGoogleSpreadsheet> {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: sheetTitles.map((t) => ({ properties: { title: t } })),
      },
    });
    return res.data as IGoogleSpreadsheet;
  }

  async getValues(spreadsheetId: string, range: string): Promise<ISheetValues> {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return {
      range: res.data.range || range,
      majorDimension: res.data.majorDimension || 'ROWS',
      values: res.data.values || [],
    };
  }

  async updateValues(
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<ISheetUpdateResponse> {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { range, majorDimension: 'ROWS', values },
    });
    return res.data as ISheetUpdateResponse;
  }

  async appendValues(
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<ISheetAppendResponse> {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { range, majorDimension: 'ROWS', values },
    });
    return res.data as ISheetAppendResponse;
  }

  async batchGetValues(
    spreadsheetId: string,
    ranges: string[]
  ): Promise<IBatchGetResponse> {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });
    return {
      spreadsheetId,
      valueRanges: res.data.valueRanges as ISheetValues[],
    };
  }

  async batchUpdateValues(
    spreadsheetId: string,
    data: Array<{ range: string; values: any[][] }>
  ): Promise<IBatchUpdateResponse> {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: data.map((d) => ({ range: d.range, majorDimension: 'ROWS', values: d.values })),
      },
    });
    return res.data as IBatchUpdateResponse;
  }

  async clearValues(spreadsheetId: string, range: string): Promise<void> {
    const sheets = await this.getClient();
    await sheets.spreadsheets.values.clear({ spreadsheetId, range });
  }

  async addSheet(
    spreadsheetId: string,
    title: string,
    options: any = {}
  ): Promise<any> {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title, ...options } } }],
      },
    });
    return res.data;
  }

  async deleteSheet(spreadsheetId: string, sheetId: number): Promise<void> {
    const sheets = await this.getClient();
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ deleteSheet: { sheetId } }],
      },
    });
  }

  async formatCells(
    spreadsheetId: string,
    sheetId: number,
    startRowIndex: number,
    endRowIndex: number,
    startColumnIndex: number,
    endColumnIndex: number,
    format: any
  ): Promise<void> {
    const sheets = await this.getClient();
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex, endRowIndex, startColumnIndex, endColumnIndex },
              cell: { userEnteredFormat: format },
              fields: 'userEnteredFormat',
            },
          },
        ],
      },
    });
  }

  async createNamedRange(
    spreadsheetId: string,
    name: string,
    sheetId: number,
    startRowIndex: number,
    endRowIndex: number,
    startColumnIndex: number,
    endColumnIndex: number
  ): Promise<INamedRange> {
    const sheets = await this.getClient();
    const res = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addNamedRange: {
              namedRange: {
                name,
                range: { sheetId, startRowIndex, endRowIndex, startColumnIndex, endColumnIndex },
              },
            },
          },
        ],
      },
    });
    const reply = res.data.replies?.[0]?.addNamedRange?.namedRange;
    return reply as INamedRange;
  }

  async getNamedRanges(spreadsheetId: string): Promise<INamedRange[]> {
    const spreadsheet = await this.getSpreadsheet(spreadsheetId);
    return spreadsheet.namedRanges || [];
  }
}

export const SheetsServiceDefinition: Reactory.Service.IReactoryServiceDefinition<SheetsService> = {
  service: (props: any, context: any) => new SheetsService(props, context),
  id: 'google.SheetsService@1.0.0',
  name: 'SheetsService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google Sheets API operations service',
  serviceType: 'data',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
  ],
};

export { SheetsService };
