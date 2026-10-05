// Only the declared label adapter changes. Borrowed complete active-word capture stays pinned.
export function createProductionSnapshotTools(createBorrowedLoftSnapshotTools) {
  const tools = createBorrowedLoftSnapshotTools();
  const labels = { initial: 'initial', 'first-pop-up': 'first-pop-up', 'first-standing': 'first-landing', 'formed-mouth': 'first-landing', 'first-entry': 'first-landing', terminal: 'terminal' };
  return { capture(loft, label, epoch) {
    if (!Object.hasOwn(labels, label)) throw Error('Undeclared production checkpoint');
    const result = tools.capture(loft, labels[label], epoch);
    result.label = label;
    result.labelAdaptation = { policy: 'production-gameplay-checkpoint-labels/v1', borrowedLabel: labels[label], sourceGeometryAndEncodingUnchanged: true };
    return result;
  } };
}
