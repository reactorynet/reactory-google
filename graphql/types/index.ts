import { loadGraphQLTypeDefinitions } from '@reactory/server-core/graph/graphql-loader';
import path from 'path';

const typeDefs = loadGraphQLTypeDefinitions([
  'Auth', 'Gmail', 'Calendar', 'Drive', 'Docs', 'Sheets', 'Contacts', 'Tasks',
], path.join(__dirname));

export default typeDefs;
