/** 파일 저장: iOS는 공유 시트(파일 앱·iCloud Drive), 안 되면 다운로드 */
/**
 * 공유 시트를 쓸 수 있으면 공유만 시도한다. 공유가 취소 외의 이유로 실패하면 'failed'.
 * (iOS 홈 화면 앱에서 다운로드로 넘어가면 실제로 저장되지 않을 수 있어서, 백업한 것으로 치지 않는다)
 * 공유를 못 쓰는 환경에서만 다운로드한다.
 */
export async function shareOrDownload(filename: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled' | 'failed'> {
  const file = new File([text], filename, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename });
      return 'shared';
    } catch (e) {
      return (e as DOMException)?.name === 'AbortError' ? 'cancelled' : 'failed';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

export function readFile(file: File): Promise<string> {
  return file.text();
}
