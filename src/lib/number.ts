/** 입력 문자열을 숫자로. 쉼표 소수점 허용, 빈칸·잘못된 값은 undefined. */
export function parseNum(input: string): number | undefined {
  const s = input.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(s)) return undefined;
  return Number(s);
}
