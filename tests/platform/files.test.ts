import { shareOrDownload } from '../../src/platform/files';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function stubShare(impl: () => Promise<void>) {
  vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share: vi.fn(impl) });
}

test('공유 성공 → shared', async () => {
  stubShare(() => Promise.resolve());
  expect(await shareOrDownload('a.json', '{}')).toBe('shared');
});
test('사용자가 취소 → cancelled', async () => {
  stubShare(() => Promise.reject(new DOMException('x', 'AbortError')));
  expect(await shareOrDownload('a.json', '{}')).toBe('cancelled');
});
test('공유가 다른 이유로 실패 → failed (다운로드로 넘어가지 않음)', async () => {
  stubShare(() => Promise.reject(new DOMException('x', 'NotAllowedError')));
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  expect(await shareOrDownload('a.json', '{}')).toBe('failed');
  expect(click).not.toHaveBeenCalled();
});
