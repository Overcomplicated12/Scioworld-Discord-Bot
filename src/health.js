const schedulerRuns = new Map();

export function markSchedulerRun(name, at = Date.now()) {
  schedulerRuns.set(name, at);
}

export function schedulerHealth() {
  return Object.fromEntries(schedulerRuns.entries());
}
