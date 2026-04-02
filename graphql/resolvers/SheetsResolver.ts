import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';

@resolver
class SheetsResolver {
  resolver: any;

  private getService(context: Reactory.Server.IReactoryContext) {
    const svc = context.getService('google.SheetsService@1.0.0') as any;
    if (!svc) throw new Error('Sheets Service not available');
    return svc;
  }

  @roles(['USER'], 'args.context')
  @query('spreadsheet')
  async getSpreadsheet(
    _obj: any,
    params: { spreadsheetId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).getSpreadsheet(String(context.user._id), params.spreadsheetId);
  }

  @roles(['USER'], 'args.context')
  @query('sheetValues')
  async getValues(
    _obj: any,
    params: { spreadsheetId: string; range: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).getValues(String(context.user._id), params.spreadsheetId, params.range);
  }

  @roles(['USER'], 'args.context')
  @query('sheetBatchValues')
  async batchGetValues(
    _obj: any,
    params: { spreadsheetId: string; ranges: string[] },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).batchGetValues(String(context.user._id), params.spreadsheetId, params.ranges);
  }

  @roles(['USER'], 'args.context')
  @mutation('spreadsheetCreate')
  async createSpreadsheet(
    _obj: any,
    params: { title: string; folderId?: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).createSpreadsheet(String(context.user._id), params.title, params.folderId);
  }

  @roles(['USER'], 'args.context')
  @mutation('sheetUpdateValues')
  async updateValues(
    _obj: any,
    params: { spreadsheetId: string; input: { range: string; values: string[][]; majorDimension?: string } },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).updateValues(
      String(context.user._id),
      params.spreadsheetId,
      params.input.range,
      params.input.values,
      params.input.majorDimension,
    );
  }

  @roles(['USER'], 'args.context')
  @mutation('sheetAppendValues')
  async appendValues(
    _obj: any,
    params: { spreadsheetId: string; input: { range: string; values: string[][]; majorDimension?: string } },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).appendValues(
      String(context.user._id),
      params.spreadsheetId,
      params.input.range,
      params.input.values,
      params.input.majorDimension,
    );
  }

  @roles(['USER'], 'args.context')
  @mutation('sheetClearValues')
  async clearValues(
    _obj: any,
    params: { spreadsheetId: string; range: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).clearValues(String(context.user._id), params.spreadsheetId, params.range);
    return true;
  }

  @roles(['USER'], 'args.context')
  @mutation('spreadsheetAddSheet')
  async addSheet(
    _obj: any,
    params: { spreadsheetId: string; title: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).addSheet(String(context.user._id), params.spreadsheetId, params.title);
  }

  @roles(['USER'], 'args.context')
  @mutation('spreadsheetDeleteSheet')
  async deleteSheet(
    _obj: any,
    params: { spreadsheetId: string; sheetId: number },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).deleteSheet(String(context.user._id), params.spreadsheetId, params.sheetId);
    return true;
  }
}

export default SheetsResolver;
