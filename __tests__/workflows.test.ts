import workflows, { WORKFLOW_NAMES } from '../workflows';

describe('reactory-google workflows', () => {
  it('should define all 5 standard workflow names', () => {
    expect(WORKFLOW_NAMES).toHaveLength(5);
    expect(WORKFLOW_NAMES).toContain('SendEmailWorkflow');
    expect(WORKFLOW_NAMES).toContain('CreateEventWorkflow');
    expect(WORKFLOW_NAMES).toContain('GmailSyncWorkflow');
    expect(WORKFLOW_NAMES).toContain('CalendarSyncWorkflow');
    expect(WORKFLOW_NAMES).toContain('DriveSyncWorkflow');
  });

  it('should export loaded workflow definitions array', () => {
    expect(Array.isArray(workflows)).toBe(true);
    expect(workflows.length).toBe(5);
    workflows.forEach((wf) => {
      expect(wf.nameSpace).toBe('google');
      expect(wf.version).toBe('1.0.0');
      expect(wf.name).toBeDefined();
    });
  });
});
