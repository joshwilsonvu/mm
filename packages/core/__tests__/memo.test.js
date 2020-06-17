import { renderHook } from "@testing-library/react-hooks";
import { useMemoArray } from "../src";

describe("useMemoArray", () => {
  test("memoizes handler", () => {
    const handler = jest.fn((n) => n + 1);
    const { result, rerender } = renderHook(
      (props) => useMemoArray(props.array, handler, []),
      {
        initialProps: {
          array: [1, 2, 3],
        },
      }
    );
    expect(result.current).toEqual([2, 3, 4]);
    expect(handler).toHaveBeenCalledTimes(3);

    handler.mockClear();
    rerender({
      array: [1, 2, 3, 5],
    });
    expect(result.current).toEqual([2, 3, 4, 6]);
    expect(handler).toHaveBeenCalledTimes(1); // 1, 2, 3 should be memoized
  });

  test("changed deps invalidate memoization", () => {
    let inc = 1;
    const handler = jest.fn((n) => n + inc);
    const { result, rerender } = renderHook(
      (props) => useMemoArray(props.array, handler, props.deps),
      {
        initialProps: {
          array: [1, 2, 3],
          deps: [inc],
        },
      }
    );
    expect(result.current).toEqual([2, 3, 4]);
    expect(handler).toHaveBeenCalledTimes(3);

    handler.mockClear();
    inc = 2; // change handler dependency
    rerender({
      array: [1, 2, 3],
      deps: [inc],
    });
    expect(result.current).toEqual([3, 4, 5]);
    expect(handler).toHaveBeenCalledTimes(3); // changing deps invalidates memoization
  });
});
