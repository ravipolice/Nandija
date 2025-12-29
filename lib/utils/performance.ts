/**
 * Performance monitoring utilities
 */

export const measurePerformance = <T>(
  label: string,
  fn: () => T | Promise<T>
): Promise<T> => {
  const start = performance.now();
  const result = fn();
  
  if (result instanceof Promise) {
    return result.then((value) => {
      const end = performance.now();
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
      }
      return value;
    });
  }
  
  const end = performance.now();
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
  }
  return Promise.resolve(result);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

