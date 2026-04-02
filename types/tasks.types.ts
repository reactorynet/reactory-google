/**
 * Google Tasks TypeScript types
 */

export enum TaskStatus {
  NEEDS_ACTION = 'needsAction',
  COMPLETED = 'completed',
}

export interface ITaskLink {
  type?: string;
  description?: string;
  link?: string;
}

export interface IGoogleTaskList {
  id: string;
  title?: string;
  selfLink?: string;
  updated?: string;
  etag?: string;
}

export interface IGoogleTask {
  id: string;
  title?: string;
  notes?: string;
  status?: TaskStatus;
  due?: string;
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
  selfLink?: string;
  updated?: string;
  etag?: string;
  parent?: string;
  position?: string;
  links?: ITaskLink[];
}
