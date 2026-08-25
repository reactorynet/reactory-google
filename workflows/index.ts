/**
 * Google Workspace Workflow Definitions
 * Standardized YAML workflow definitions loaded via YamlFlow.
 */

import Reactory from '@reactorynet/reactory-core';
import { loadYamlWorkflow } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/YamlToWorkflow';

const NS = 'google';
const VERSION = '1.0.0';

export const WORKFLOW_NAMES: string[] = [
  'SendEmailWorkflow',
  'CreateEventWorkflow',
  'GmailSyncWorkflow',
  'CalendarSyncWorkflow',
  'DriveSyncWorkflow',
];

const workflows: Reactory.Workflow.IWorkflow[] = WORKFLOW_NAMES
  .map((name) => loadYamlWorkflow(NS, name, `${name}.yaml`, VERSION, __dirname))
  .filter((w): w is Reactory.Workflow.IWorkflow => w !== null);

export default workflows;
