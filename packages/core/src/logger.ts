export let logger = console;

let loggingDebugDisabled = true;
export function disableLogging() {
  logger.debug = () => {
    if (!loggingDebugDisabled) {
      loggingDebugDisabled = true;
      console.info('console.debug is disabled!');
    }
  };
}
disableLogging();

export function setLogger(newLogger: Console): void {
  logger = newLogger;
}

export let printErrors = false;

export function printErrorMessages(): void {
  printErrors = true;
}
