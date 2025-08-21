export async function isDownloadLinkExpired(demoUrl: string): Promise<boolean> {
  if (!demoUrl) {
    return true;
  }

  try {
    const response = await fetch(demoUrl, {
      method: 'HEAD',
    });

    return response.status !== 200;
  } catch (error) {
    return true;
  }
}

export function unixTimestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

export function sumNumberArray(numbers: number[]): number {
  return numbers.reduce((sum, current) => sum + current, 0);
}