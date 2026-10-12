import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import { google } from 'googleapis';
import { IGoogleTaskList, IGoogleTask, TaskStatus } from '../types/tasks.types';

const TASK_LISTS_CACHE_TTL = 600;

/**
 * Public API is **userId-first** (matching GoogleAuthService and the module's
 * resolvers / macros / CLI). `userId` falls back to the execution context user
 * when omitted.
 */
@service({
  id: 'google.TasksService@1.0.0',
  name: 'TasksService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google Tasks API operations service',
  serviceType: 'data',
  lifeCycle: 'singleton',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
})
class TasksService implements Reactory.Service.IReactoryService {
  name: string = 'TasksService';
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

  private _redisService: any;

  private get redisService(): any {
    return this._redisService || this.context.getService('core.RedisService@1.0.0');
  }

  // Bound by the Reactory service container from the `redisService` dependency alias.
  setRedisService(service: any): void {
    this._redisService = service;
  }

  private getUserId(userId?: string): string {
    return String(userId || this.context.user?._id);
  }

  private async getClient(userId?: string) {
    const uid = this.getUserId(userId);
    const authClient = await this.authService.getAuthorizedClient(uid);
    return google.tasks({ version: 'v1', auth: authClient });
  }

  private taskListsCacheKey(userId?: string): string {
    return `google:${this.getUserId(userId)}:tasks:lists`;
  }

  async listTaskLists(userId?: string): Promise<IGoogleTaskList[]> {
    const cacheKey = this.taskListsCacheKey(userId);
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    const tasks = await this.getClient(userId);
    const res = await tasks.tasklists.list({ maxResults: 100 });
    const lists = (res.data.items || []) as IGoogleTaskList[];

    await this.redisService.set(cacheKey, JSON.stringify(lists), TASK_LISTS_CACHE_TTL).catch(() => {});
    return lists;
  }

  async getTaskList(userId: string, taskListId: string): Promise<IGoogleTaskList> {
    const tasks = await this.getClient(userId);
    const res = await tasks.tasklists.get({ tasklist: taskListId });
    return res.data as IGoogleTaskList;
  }

  async createTaskList(userId: string, title: string): Promise<IGoogleTaskList> {
    const tasks = await this.getClient(userId);
    const res = await tasks.tasklists.insert({ requestBody: { title } });
    await this.redisService.del(this.taskListsCacheKey(userId)).catch(() => {});
    return res.data as IGoogleTaskList;
  }

  async updateTaskList(userId: string, taskListId: string, title: string): Promise<IGoogleTaskList> {
    const tasks = await this.getClient(userId);
    const res = await tasks.tasklists.update({
      tasklist: taskListId,
      requestBody: { id: taskListId, title },
    });
    await this.redisService.del(this.taskListsCacheKey(userId)).catch(() => {});
    return res.data as IGoogleTaskList;
  }

  async deleteTaskList(userId: string, taskListId: string): Promise<void> {
    const tasks = await this.getClient(userId);
    await tasks.tasklists.delete({ tasklist: taskListId });
    await this.redisService.del(this.taskListsCacheKey(userId)).catch(() => {});
  }

  async listTasks(
    userId: string,
    taskListId: string,
    options: { maxResults?: number; pageToken?: string; showCompleted?: boolean } = {}
  ): Promise<IGoogleTask[]> {
    const tasks = await this.getClient(userId);
    const res = await tasks.tasks.list({
      tasklist: taskListId,
      maxResults: options.maxResults || 100,
      pageToken: options.pageToken,
      showCompleted: options.showCompleted !== false,
      showHidden: false,
    });
    return (res.data.items || []) as IGoogleTask[];
  }

  async getTask(userId: string, taskListId: string, taskId: string): Promise<IGoogleTask> {
    const tasks = await this.getClient(userId);
    const res = await tasks.tasks.get({ tasklist: taskListId, task: taskId });
    return res.data as IGoogleTask;
  }

  async createTask(
    userId: string,
    taskListId: string,
    task: Partial<IGoogleTask>
  ): Promise<IGoogleTask> {
    const tasks = await this.getClient(userId);
    const res = await tasks.tasks.insert({
      tasklist: taskListId,
      requestBody: task as any,
    });
    return res.data as IGoogleTask;
  }

  async updateTask(
    userId: string,
    taskListId: string,
    taskId: string,
    task: Partial<IGoogleTask>
  ): Promise<IGoogleTask> {
    const tasks = await this.getClient(userId);
    const res = await tasks.tasks.update({
      tasklist: taskListId,
      task: taskId,
      requestBody: { id: taskId, ...task } as any,
    });
    return res.data as IGoogleTask;
  }

  async deleteTask(userId: string, taskListId: string, taskId: string): Promise<void> {
    const tasks = await this.getClient(userId);
    await tasks.tasks.delete({ tasklist: taskListId, task: taskId });
  }

  async completeTask(userId: string, taskListId: string, taskId: string): Promise<IGoogleTask> {
    return this.updateTask(userId, taskListId, taskId, {
      status: TaskStatus.COMPLETED,
      completed: new Date().toISOString(),
    });
  }

  async moveTask(
    userId: string,
    taskListId: string,
    taskId: string,
    parentId?: string,
    previousId?: string
  ): Promise<IGoogleTask> {
    const tasks = await this.getClient(userId);
    const res = await tasks.tasks.move({
      tasklist: taskListId,
      task: taskId,
      parent: parentId,
      previous: previousId,
    });
    return res.data as IGoogleTask;
  }

  async clearCompleted(userId: string, taskListId: string): Promise<void> {
    const tasks = await this.getClient(userId);
    await tasks.tasks.clear({ tasklist: taskListId });
  }
}

export const TasksServiceDefinition: Reactory.Service.IReactoryServiceDefinition<TasksService> = {
  service: (props: any, context: any) => new TasksService(props, context),
  id: 'google.TasksService@1.0.0',
  name: 'TasksService',
  nameSpace: 'google',
  version: '1.0.0',
  description: 'Google Tasks API operations service',
  serviceType: 'data',
  dependencies: [
    { id: 'google.GoogleAuthService@1.0.0', alias: 'googleAuthService' },
    { id: 'core.RedisService@1.0.0', alias: 'redisService' },
  ],
};

export { TasksService };
