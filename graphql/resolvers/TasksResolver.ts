import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';

@resolver
class TasksResolver {
  resolver: any;

  private getService(context: Reactory.Server.IReactoryContext) {
    const svc = context.getService('google.TasksService@1.0.0') as any;
    if (!svc) throw new Error('Tasks Service not available');
    return svc;
  }

  @roles(['USER'], 'args.context')
  @query('taskLists')
  async listTaskLists(_obj: any, _params: Record<string, unknown>, context: Reactory.Server.IReactoryContext) {
    return this.getService(context).listTaskLists(String(context.user._id));
  }

  @roles(['USER'], 'args.context')
  @query('taskList')
  async getTaskList(
    _obj: any,
    params: { taskListId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).getTaskList(String(context.user._id), params.taskListId);
  }

  @roles(['USER'], 'args.context')
  @query('tasks')
  async listTasks(
    _obj: any,
    params: { taskListId: string; showCompleted?: boolean; showHidden?: boolean; maxResults?: number; pageToken?: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).listTasks(String(context.user._id), params.taskListId, {
      showCompleted: params.showCompleted,
      showHidden: params.showHidden,
      maxResults: params.maxResults,
      pageToken: params.pageToken,
    });
  }

  @roles(['USER'], 'args.context')
  @query('task')
  async getTask(
    _obj: any,
    params: { taskListId: string; taskId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).getTask(String(context.user._id), params.taskListId, params.taskId);
  }

  @roles(['USER'], 'args.context')
  @mutation('taskListCreate')
  async createTaskList(
    _obj: any,
    params: { title: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).createTaskList(String(context.user._id), params.title);
  }

  @roles(['USER'], 'args.context')
  @mutation('taskListUpdate')
  async updateTaskList(
    _obj: any,
    params: { taskListId: string; title: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).updateTaskList(String(context.user._id), params.taskListId, params.title);
  }

  @roles(['USER'], 'args.context')
  @mutation('taskListDelete')
  async deleteTaskList(
    _obj: any,
    params: { taskListId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).deleteTaskList(String(context.user._id), params.taskListId);
    return true;
  }

  @roles(['USER'], 'args.context')
  @mutation('taskCreate')
  async createTask(
    _obj: any,
    params: { taskListId: string; input: Record<string, any> },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).createTask(String(context.user._id), params.taskListId, params.input);
  }

  @roles(['USER'], 'args.context')
  @mutation('taskUpdate')
  async updateTask(
    _obj: any,
    params: { taskListId: string; taskId: string; input: Record<string, any> },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).updateTask(
      String(context.user._id),
      params.taskListId,
      params.taskId,
      params.input,
    );
  }

  @roles(['USER'], 'args.context')
  @mutation('taskDelete')
  async deleteTask(
    _obj: any,
    params: { taskListId: string; taskId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).deleteTask(String(context.user._id), params.taskListId, params.taskId);
    return true;
  }

  @roles(['USER'], 'args.context')
  @mutation('taskComplete')
  async completeTask(
    _obj: any,
    params: { taskListId: string; taskId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).completeTask(String(context.user._id), params.taskListId, params.taskId);
  }

  @roles(['USER'], 'args.context')
  @mutation('taskClearCompleted')
  async clearCompleted(
    _obj: any,
    params: { taskListId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    await this.getService(context).clearCompleted(String(context.user._id), params.taskListId);
    return true;
  }
}

export default TasksResolver;
