type ProviderError = { status?: number };
type Sleep = (milliseconds: number) => Promise<void>;

const sleep: Sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function withProviderRetry<T>(operation: () => Promise<T>, wait: Sleep = sleep): Promise<T> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const status = (error as ProviderError)?.status;
      const transient = status === 429 || (typeof status === 'number' && status >= 500);
      if (!transient || attempt === maxAttempts) throw error;
      await wait(250 * 2 ** (attempt - 1));
    }
  }

  throw new Error('Provider retry loop ended unexpectedly');
}
