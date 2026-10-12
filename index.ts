import Reactory from '@reactorynet/reactory-core';
import GraphqlDefinitions from './graphql';
import Workflows from './workflows';
import Services from './services';
import Models from './models';
import Forms from './forms';
import Middlewares from './middleware';
import CliCommands from './cli';
import routes from './routes';
import { GOOGLE_MACROS, GOOGLE_TOOLS } from './ai';

const ReactoryGoogleModule: Reactory.Server.IReactoryModule = {
  id: 'reactory-google',
  nameSpace: 'google',
  version: '1.0.0',
  name: 'ReactoryGoogle',
  description: 'Google Workspace integration — Gmail, Calendar, Drive, Docs, Sheets, Contacts, Tasks',
  dependencies: ['core.ReactoryServer@1.0.0'],
  priority: 99,
  graphDefinitions: GraphqlDefinitions,
  workflows: Workflows,
  forms: Forms,
  services: Services,
  models: Models,
  middleware: Middlewares,
  cli: CliCommands,
  routes: {
    '/google': routes,
  },
  grpc: [],
  translations: [],
  clientPlugins: [],
  passportProviders: [],
  pdfs: [],
  reactor: {
    providers: [],
    agents: [],
    macros: GOOGLE_MACROS,
    tools: GOOGLE_TOOLS,
    mcp: [],
  },
};

export default ReactoryGoogleModule;
