export type AutomationCanvasViewport = {
  zoom: number;
  panX: number;
  panY: number;
};

export const defaultAutomationCanvasViewport: AutomationCanvasViewport = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

export function normalizeAutomationCanvasViewport(
  value: Partial<AutomationCanvasViewport> | null | undefined,
): AutomationCanvasViewport {
  return {
    zoom: Math.min(
      2,
      Math.max(0.4, Number(value?.zoom ?? 1)),
    ),
    panX: Number(value?.panX ?? 0),
    panY: Number(value?.panY ?? 0),
  };
}
