/**
 * Google Docs-specific TypeScript types
 */

export interface IGoogleDoc {
  documentId: string;
  title: string;
  revisionId?: string;
  body?: any;
  headers?: any;
  footers?: any;
  footnotes?: any;
  documentStyle?: any;
  namedStyles?: any;
  lists?: any;
  namedRanges?: any;
  inlineObjects?: any;
  positionedObjects?: any;
}

export interface IDocBatchUpdateRequest {
  requests: any[];
}

export interface IDocBatchUpdateResponse {
  documentId: string;
  replies?: any[];
  writeControl?: any;
}
