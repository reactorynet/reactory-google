export { GOOGLE_MACROS } from './macros';
export { GoogleWorkspacePersona } from './persona/GoogleWorkspaceAssistant/GoogleWorkspacePersona';

import { GOOGLE_MACROS } from './macros';
import { GoogleWorkspacePersona } from './persona/GoogleWorkspaceAssistant/GoogleWorkspacePersona';

export default {
  macros: GOOGLE_MACROS,
  personas: [GoogleWorkspacePersona],
};

