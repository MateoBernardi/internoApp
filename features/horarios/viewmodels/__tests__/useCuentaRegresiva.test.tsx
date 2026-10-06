import { act, renderHook } from '@testing-library/react-native';
import { useCuentaRegresiva } from '../useCuentaRegresiva';

describe('useCuentaRegresiva', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-02T12:00:00.000Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('cuenta hacia atrás cada segundo y queda vencida al llegar a 0', () => {
    const { result } = renderHook(() => useCuentaRegresiva('2026-10-02T12:00:03.000Z'));
    act(() => { jest.advanceTimersByTime(0); });
    expect(result.current).toEqual({ segundos: 3, vencido: false });

    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current.segundos).toBe(2);

    act(() => { jest.advanceTimersByTime(2000); });
    expect(result.current).toEqual({ segundos: 0, vencido: true });
  });

  it('sin vencimiento no cuenta y no se considera vencida', () => {
    const { result } = renderHook(() => useCuentaRegresiva(null));
    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current).toEqual({ segundos: 0, vencido: false });
  });

  it('al cambiar el vencimiento (nueva revisión) recalcula desde el nuevo valor', () => {
    const { result, rerender } = renderHook(({ exp }: { exp: string | null }) => useCuentaRegresiva(exp), {
      initialProps: { exp: '2026-10-02T12:00:10.000Z' as string | null },
    });
    act(() => { jest.advanceTimersByTime(0); });
    expect(result.current.segundos).toBe(10);

    rerender({ exp: '2026-10-02T12:30:00.000Z' });
    act(() => { jest.advanceTimersByTime(0); });
    expect(result.current).toEqual({ segundos: 1800, vencido: false });
  });
});
