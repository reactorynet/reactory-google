export { GOOGLE_MACROS, GOOGLE_TOOLS } from './macros';
export { GoogleWorkspacePersona } from './persona/GoogleWorkspaceAssistant/GoogleWorkspacePersona';

import { GOOGLE_MACROS, GOOGLE_TOOLS } from './macros';
import { GoogleWorkspacePersona } from './persona/GoogleWorkspaceAssistant/GoogleWorkspacePersona';

export default {
  macros: GOOGLE_MACROS,
  tools: GOOGLE_TOOLS,
  personas: [GoogleWorkspacePersona],
};

