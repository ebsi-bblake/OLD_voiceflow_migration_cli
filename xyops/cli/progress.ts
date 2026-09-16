type ProgressTask<T> = () => Promise<T>;

type ProgressReporter = {
  readonly run: <T>(label: string, task: ProgressTask<T>) => Promise<T>;
  readonly pause: () => void;
  readonly resume: () => void;
};

type ProgressLifecycle = Readonly<{
  pause: () => void;
  resume: () => void;
}>;

const BAR_WIDTH = 10;
const TICK_MS = 200;

const progressLine = (label: string, tick: number): string => {
  const filled = tick % (BAR_WIDTH + 1);
  const bar = `${"#".repeat(filled)}${"_".repeat(BAR_WIDTH - filled)}`;
  return `${label} [${bar}]`;
};

const createProgressReporter = (): ProgressReporter => {
  let lifecycle: ProgressLifecycle | undefined;

  const pause = (): void => lifecycle?.pause();
  const resume = (): void => lifecycle?.resume();

  const run = <T>(label: string, task: ProgressTask<T>): Promise<T> => {
    if (!process.stderr.isTTY) return task();
    const name = label
      .split("_")
      .map((w, i) => `${w[0].toUpperCase()}${w.slice(1)}${i ? "" : "ing"}`)
      .join(" ");

    let tick = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    let finished = false;
    let paused = false;
    const render = (): void => {
      process.stderr.write(`\r${progressLine(name, tick++)}`);
    };
    const startTimer = (): void => {
      if (!paused && !finished && timer === undefined) {
        timer = setInterval(render, TICK_MS);
      }
    };
    const stopTimer = (): void => {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };
    const currentLifecycle: ProgressLifecycle = {
      pause: () => {
        paused = true;
        stopTimer();
      },
      resume: () => {
        paused = false;
        if (!finished) {
          render();
          startTimer();
        }
      },
    };
    lifecycle = currentLifecycle;
    render();
    startTimer();
    const finish = (status: "done" | "failed"): void => {
      if (finished) return;
      finished = true;
      stopTimer();
      process.stderr.write(`\r${name} [${"#".repeat(BAR_WIDTH)}] ${status}\n`);
      if (lifecycle === currentLifecycle) lifecycle = undefined;
    };
    let taskResult: Promise<T>;
    try {
      taskResult = task();
    } catch (error: unknown) {
      finish("failed");
      return Promise.reject(error);
    }
    return taskResult.then(
      (result) => {
        finish("done");
        return result;
      },
      (error: unknown) => {
        finish("failed");
        return Promise.reject(error);
      },
    );
  };

  return { run, pause, resume };
};

export const progress = createProgressReporter();
