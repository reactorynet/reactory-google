import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import { google } from 'googleapis';
import { IGoogleTaskList, IGoogleTask, TaskStatus } from '../types/tasks.types';

const TASK_LISTS_CACHE_TTL = 600;

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

  private get redisService(): any {
    return this.context.getService('core.RedisService@1.0.0');
  }

  private getUserId(): string {
    return String(this.context.user?._id);
  }

  private async getClient() {
    const userId = this.getUserId();
    const authClient = await this.authService.getAuthorizedClient(userId);
    return google.tasks({ version: 'v1', auth: authClient });
  }

  private taskListsCacheKey(): string {
    return `google:${this.getUserId()}:tasks:lists`;
  }

  async listTaskLists(): Promise<IGoogleTaskList[]> {
    const cacheKey = this.taskListsCacheKey();
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    const tasks = await this.getClient();
    const res = await tasks.tasklists.list({ maxResults: 100 });
    const lists = (res.data.items || []) as IGoogleTaskList[];

    await this.redisService.set(cacheKey, JSON.stringify(lists), TASK_LISTS_CACHE_TTL).catch(() => {});
    return lists;
  }

  async getTaskList(taskListId: string): Promise<IGoogleTaskList> {
    const tasks = await this.getClient();
    const res = await tasks.tasklists.get({ tasklist: taskListId });
    return res.data as IGoogleTaskList;
  }

  async createTaskList(title: string): Promise<IGoogleTaskList> {
    const tasks = await this.getClient();
    const res = await tasks.tasklists.insert({ requestBody: { title } });
    await this.redisService.del(this.taskListsCacheKey()).catch(() => {});
    return res.data as IGoogleTaskList;
  }

  async updateTaskList(taskListId: string, title: string): Promise<IGoogleTaskList> {
    const tasks = await this.getClient();
    const res = await tasks.tasklists.update({
      tasklist: taskListId,
      requestBody: { id: taskListId, title },
    });
    await this.redisService.del(this.taskListsCacheKey()).catch(() => {});
    return res.data as IGoogleTaskList;
  }

  async deleteTaskList(taskListId: string): Promise<void> {
    const tasks = await this.getClient();
    await tasks.tasklists.delete({ tasklist: taskListId });
    await this.redisService.del(this.taskListsCacheKey()).catch(() => {});
  }

  async listTasks(
    taskListId: string,
    options: { maxResults?: number; pageToken?: string; showCompleted?: boolean } = {}
  ): Promise<IGoogleTask[]> {
    const tasks = await this.getClient();
    const res = await tasks.tasks.list({
      tasklist: taskListId,
      maxResults: options.maxResults || 100,
      pageToken: options.pageToken,
      showCompleted: options.showCompleted !== false,
      showHidden: false,
    });
    return (res.data.items || []) as IGoogleTask[];
  }

  async getTask(taskListId: string, taskId: string): Promise<IGoogleTask> {
    const tasks = await this.getClient();
    const res = await tasks.tasks.get({ tasklist: taskListId, task: taskId });
    return res.data as IGoogleTask;
  }

  async createTask(
    taskListId: string,
    task: Partial<IGoogleTask>
  ): Promise<IGoogleTask> {
    const tasks = await this.getClient();
    const res = await tasks.tasks.insert({
      tasklist: taskListId,
      requestBody: task as any,
    });
    return res.data as IGoogleTask;
  }

  async updateTask(
    taskListId: string,
    taskId: string,
    task: Partial<IGoogleTask>
  ): Promise<IGoogleTask> {
    const tasks = await this.getClient();
    const res = await tasks.tasks.update({
      tasklist: taskListId,
      task: taskId,
      requestBody: { id: taskId, ...task } as any,
    });
    return res.data as IGoogleTask;
  }

  async deleteTask(taskListId: string, taskId: string): Promise<void> {
    const tasks = await this.getClient();
    await tasks.tasks.delete({ tasklist: taskListId, task: taskId });
  }

  async completeTask(taskListId: string, taskId: string): Promise<IGoogleTask> {
    return this.updateTask(taskListId, taskId, {
      status: TaskStatus.COMPLETED,
      completed: new Date().toISOString(),
    });
  }

  async moveTask(
    taskListId: string,
    taskId: string,
    parentId?: string,
    previousId?: string
  ): Promise<IGoogleTask> {
    const tasks = await this.getClient();
    const res = await tasks.tasks.move({
      tasklist: taskListId,
      task: taskId,
      parent: parentId,
      previous: previousId,
    });
    return res.data as IGoogleTask;
  }

  async clearCompleted(taskListId: string): Promise<void> {
    const tasks = await this.getClient();
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
