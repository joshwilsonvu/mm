import { renderHook } from "@testing-library/react-hooks";
import { useInterval } from "./interval";

test("useInterval", () => {
  jest.useFakeTimers();

  const handler = jest.fn();
  let delay = 100;
  const { rerender } = renderHook(() => useInterval(handler, delay));

  expect(handler).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(500);
  expect(handler).toHaveBeenCalledTimes(5);

  handler.mockClear();
  delay = 250;
  rerender();
  expect(handler).toHaveBeenCalledTimes(0);
  jest.advanceTimersByTime(500);
  expect(handler).toHaveBeenCalledTimes(2);
});
