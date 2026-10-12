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

/**
 * Public API is **userId-first** (matching GoogleAuthService and the module's
 * resolvers / macros / CLI). `userId` falls back to the execution context user
 * when omitted.
 */
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

  private getUserId(userId?: string): string {
    return String(userId || this.context.user?._id);
  }

  private async getClient(userId?: string) {
    const uid = this.getUserId(userId);
    const authClient = await this.authService.getAuthorizedClient(uid);
    return google.sheets({ version: 'v4', auth: authClient });
  }

  async getSpreadsheet(userId: string, spreadsheetId: string): Promise<IGoogleSpreadsheet> {
    const sheets = await this.getClient(userId);
    const res = await sheets.spreadsheets.get({ spreadsheetId });
    return res.data as IGoogleSpreadsheet;
  }

  async createSpreadsheet(userId: string, title: string, sheetTitles: string[] = []): Promise<IGoogleSpreadsheet> {
    const sheets = await this.getClient(userId);
    // Defensive: callers historically passed a folderId string here. Only a real
    // array of titles should seed sheets.
    const titles = Array.isArray(sheetTitles) ? sheetTitles : [];
    const res = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: titles.map((t) => ({ properties: { title: t } })),
      },
    });
    return res.data as IGoogleSpreadsheet;
  }

  async getValues(userId: string, spreadsheetId: string, range: string): Promise<ISheetValues> {
    const sheets = await this.getClient(userId);
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return {
      range: res.data.range || range,
      majorDimension: res.data.majorDimension || 'ROWS',
      values: res.data.values || [],
    };
  }

  async updateValues(
    userId: string,
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<ISheetUpdateResponse> {
    const sheets = await this.getClient(userId);
    const res = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { range, majorDimension: 'ROWS', values },
    });
    return res.data as ISheetUpdateResponse;
  }

  async appendValues(
    userId: string,
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<ISheetAppendResponse> {
    const sheets = await this.getClient(userId);
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { range, majorDimension: 'ROWS', values },
    });
    return res.data as ISheetAppendResponse;
  }

  async batchGetValues(
    userId: string,
    spreadsheetId: string,
    ranges: string[]
  ): Promise<IBatchGetResponse> {
    const sheets = await this.getClient(userId);
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
    userId: string,
    spreadsheetId: string,
    data: Array<{ range: string; values: any[][] }>
  ): Promise<IBatchUpdateResponse> {
    const sheets = await this.getClient(userId);
    const res = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: data.map((d) => ({ range: d.range, majorDimension: 'ROWS', values: d.values })),
      },
    });
    return res.data as IBatchUpdateResponse;
  }

  async clearValues(userId: string, spreadsheetId: string, range: string): Promise<void> {
    const sheets = await this.getClient(userId);
    await sheets.spreadsheets.values.clear({ spreadsheetId, range });
  }

  async addSheet(
    userId: string,
    spreadsheetId: string,
    title: string,
    options: any = {}
  ): Promise<any> {
    const sheets = await this.getClient(userId);
    const res = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title, ...options } } }],
      },
    });
    return res.data;
  }

  async deleteSheet(userId: string, spreadsheetId: string, sheetId: number): Promise<void> {
    const sheets = await this.getClient(userId);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ deleteSheet: { sheetId } }],
      },
    });
  }

  async formatCells(
    userId: string,
    spreadsheetId: string,
    sheetId: number,
    startRowIndex: number,
    endRowIndex: number,
    startColumnIndex: number,
    endColumnIndex: number,
    format: any
  ): Promise<void> {
    const sheets = await this.getClient(userId);
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
    userId: string,
    spreadsheetId: string,
    name: string,
    sheetId: number,
    startRowIndex: number,
    endRowIndex: number,
    startColumnIndex: number,
    endColumnIndex: number
  ): Promise<INamedRange> {
    const sheets = await this.getClient(userId);
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

  async getNamedRanges(userId: string, spreadsheetId: string): Promise<INamedRange[]> {
    const spreadsheet = await this.getSpreadsheet(userId, spreadsheetId);
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
