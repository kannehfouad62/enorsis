type ProcessMiningTask = {
  id: string;
  status: string;
  availableAt: Date | null;
  dueAt: Date | null;
  startedAt: Date | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  workflowStep: {
    id: string;
    key: string;
    name: string;
    sequence: number;
    type: string;
  };
};

type ProcessMiningInstance = {
  id: string;
  status: string;
  resourceType: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  workflowDefinition: {
    id: string;
    key: string;
    name: string;
    version: number;
  };
  tasks: ProcessMiningTask[];
};

function hoursBetween(start: Date, end: Date) {
  return Math.max(
    0,
    Math.round(
      ((end.getTime() - start.getTime()) / 3_600_000) * 100,
    ) / 100,
  );
}

function average(values: number[]) {
  if (values.length === 0) return null;

  return (
    Math.round(
      (values.reduce((sum, value) => sum + value, 0) /
        values.length) *
        100,
    ) / 100
  );
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(
      0,
      Math.ceil((percentileValue / 100) * sorted.length) - 1,
    ),
  );

  return sorted[index];
}

function taskDurationHours(task: ProcessMiningTask) {
  const start =
    task.startedAt ?? task.availableAt ?? task.createdAt;
  const end =
    task.decidedAt ??
    ([
      "APPROVED",
      "REJECTED",
      "RETURNED",
      "COMPLETED",
      "SKIPPED",
      "CANCELLED",
      "FAILED",
    ].includes(task.status)
      ? task.updatedAt
      : new Date());

  return hoursBetween(start, end);
}

function instanceDurationHours(instance: ProcessMiningInstance) {
  const start = instance.startedAt ?? instance.createdAt;
  const end =
    instance.completedAt ??
    ([
      "COMPLETED",
      "REJECTED",
      "CANCELLED",
      "FAILED",
    ].includes(instance.status)
      ? instance.tasks.reduce(
          (latest, task) =>
            task.updatedAt > latest ? task.updatedAt : latest,
          start,
        )
      : new Date());

  return hoursBetween(start, end);
}

function variantKey(instance: ProcessMiningInstance) {
  const ordered = [...instance.tasks].sort((left, right) => {
    if (
      left.workflowStep.sequence !== right.workflowStep.sequence
    ) {
      return (
        left.workflowStep.sequence -
        right.workflowStep.sequence
      );
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });

  if (ordered.length === 0) {
    return "No tasks";
  }

  return ordered
    .map(
      (task) =>
        `${task.workflowStep.name}:${task.status}`,
    )
    .join(" → ");
}

export function mineWorkflowProcesses(
  instances: ProcessMiningInstance[],
) {
  const now = new Date();

  const completedInstances = instances.filter(
    (instance) => instance.completedAt !== null,
  );

  const cycleTimes = completedInstances.map(
    instanceDurationHours,
  );

  const overdueTasks = instances.flatMap(
    (instance) =>
      instance.tasks.filter(
        (task) =>
          task.dueAt !== null &&
          task.dueAt < now &&
          ![
            "APPROVED",
            "REJECTED",
            "RETURNED",
            "COMPLETED",
            "SKIPPED",
            "CANCELLED",
            "FAILED",
          ].includes(task.status),
      ),
  );

  const escalatedTasks = instances.flatMap(
    (instance) =>
      instance.tasks.filter(
        (task) => task.status === "ESCALATED",
      ),
  );

  const returnedTasks = instances.flatMap(
    (instance) =>
      instance.tasks.filter(
        (task) =>
          task.status === "RETURNED" ||
          task.status === "REJECTED",
      ),
  );

  const bottleneckMap = new Map<
    string,
    {
      stepName: string;
      stepType: string;
      durations: number[];
      overdueCount: number;
      escalatedCount: number;
      occurrenceCount: number;
    }
  >();

  for (const instance of instances) {
    for (const task of instance.tasks) {
      const key = task.workflowStep.id;
      const current = bottleneckMap.get(key) ?? {
        stepName: task.workflowStep.name,
        stepType: task.workflowStep.type,
        durations: [],
        overdueCount: 0,
        escalatedCount: 0,
        occurrenceCount: 0,
      };

      current.durations.push(taskDurationHours(task));
      current.occurrenceCount += 1;

      if (
        task.dueAt &&
        task.dueAt < now &&
        ![
          "APPROVED",
          "REJECTED",
          "RETURNED",
          "COMPLETED",
          "SKIPPED",
          "CANCELLED",
          "FAILED",
        ].includes(task.status)
      ) {
        current.overdueCount += 1;
      }

      if (task.status === "ESCALATED") {
        current.escalatedCount += 1;
      }

      bottleneckMap.set(key, current);
    }
  }

  const bottlenecks = [...bottleneckMap.values()]
    .map((item) => ({
      stepName: item.stepName,
      stepType: item.stepType,
      occurrenceCount: item.occurrenceCount,
      averageDurationHours:
        average(item.durations) ?? 0,
      p90DurationHours:
        percentile(item.durations, 90) ?? 0,
      overdueCount: item.overdueCount,
      escalatedCount: item.escalatedCount,
      bottleneckScore:
        Math.round(
          ((average(item.durations) ?? 0) +
            item.overdueCount * 4 +
            item.escalatedCount * 6) *
            100,
        ) / 100,
    }))
    .sort(
      (left, right) =>
        right.bottleneckScore - left.bottleneckScore,
    )
    .slice(0, 10);

  const variantMap = new Map<
    string,
    {
      path: string;
      count: number;
      durations: number[];
      completed: number;
    }
  >();

  for (const instance of instances) {
    const path = variantKey(instance);
    const current = variantMap.get(path) ?? {
      path,
      count: 0,
      durations: [],
      completed: 0,
    };

    current.count += 1;
    current.durations.push(instanceDurationHours(instance));

    if (instance.completedAt) {
      current.completed += 1;
    }

    variantMap.set(path, current);
  }

  const variants = [...variantMap.values()]
    .map((variant) => ({
      path: variant.path,
      count: variant.count,
      sharePercent:
        instances.length > 0
          ? Math.round(
              (variant.count / instances.length) * 10000,
            ) / 100
          : 0,
      averageCycleHours:
        average(variant.durations) ?? 0,
      completionRate:
        variant.count > 0
          ? Math.round(
              (variant.completed / variant.count) * 10000,
            ) / 100
          : 0,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 12);

  const definitionMap = new Map<
    string,
    {
      name: string;
      key: string;
      version: number;
      instances: ProcessMiningInstance[];
    }
  >();

  for (const instance of instances) {
    const key = instance.workflowDefinition.id;
    const current = definitionMap.get(key) ?? {
      name: instance.workflowDefinition.name,
      key: instance.workflowDefinition.key,
      version: instance.workflowDefinition.version,
      instances: [],
    };
    current.instances.push(instance);
    definitionMap.set(key, current);
  }

  const processes = [...definitionMap.values()]
    .map((process) => {
      const processCompleted = process.instances.filter(
        (instance) => instance.completedAt,
      );
      const processCycle = processCompleted.map(
        instanceDurationHours,
      );
      const processOverdue = process.instances.reduce(
        (count, instance) =>
          count +
          instance.tasks.filter(
            (task) =>
              task.dueAt &&
              task.dueAt < now &&
              ![
                "APPROVED",
                "REJECTED",
                "RETURNED",
                "COMPLETED",
                "SKIPPED",
                "CANCELLED",
                "FAILED",
              ].includes(task.status),
          ).length,
        0,
      );

      return {
        name: process.name,
        key: process.key,
        version: process.version,
        instanceCount: process.instances.length,
        completedCount: processCompleted.length,
        averageCycleHours: average(processCycle),
        p90CycleHours: percentile(processCycle, 90),
        overdueTasks: processOverdue,
        conformancePercent:
          process.instances.length > 0
            ? Math.max(
                0,
                Math.round(
                  (1 -
                    processOverdue /
                      Math.max(
                        1,
                        process.instances.reduce(
                          (total, instance) =>
                            total + instance.tasks.length,
                          0,
                        ),
                      )) *
                    10000,
                ) / 100,
              )
            : 100,
      };
    })
    .sort(
      (left, right) =>
        right.instanceCount - left.instanceCount,
    );

  return {
    summary: {
      totalInstances: instances.length,
      completedInstances: completedInstances.length,
      averageCycleHours: average(cycleTimes),
      p90CycleHours: percentile(cycleTimes, 90),
      overdueTasks: overdueTasks.length,
      escalatedTasks: escalatedTasks.length,
      reworkSignals: returnedTasks.length,
      variantCount: variantMap.size,
    },
    processes,
    variants,
    bottlenecks,
  };
}
