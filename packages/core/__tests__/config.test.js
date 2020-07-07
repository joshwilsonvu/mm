/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react-hooks";
import {
  useCurrentConfig,
  useSetConfig,
  useModifyConfig,
  internal_setCurrentConfig,
  internal_getCurrentConfig,
} from "../src";

const initialConfig = { port: 8080, timeFormat: 12 };

beforeEach(() => internal_setCurrentConfig(initialConfig));

test("useCurrentConfig", () => {
  const { result, rerender } = renderHook(() => useCurrentConfig());
  expect(result.current).toEqual(
    expect.objectContaining({
      port: 8080,
      timeFormat: 12,
    })
  );
  expect(result.current).toBe(internal_getCurrentConfig());
  const first = internal_getCurrentConfig();
  rerender();
  expect(first).toBe(result.current); // referential equality
});

test("useSetConfig", () => {
  const { result } = renderHook(() => useSetConfig());
  expect(typeof result.current).toBe("function");
  const setConfig = result.current;
  const newConfig = {
    language: "fr",
    timeFormat: 24,
    units: "imperial",
    modules: [],
  };
  act(() => {
    setConfig((oldConfig) => {
      return {
        ...oldConfig,
        ...newConfig,
      };
    });
  });
  expect(internal_getCurrentConfig()).toEqual(
    expect.objectContaining(newConfig)
  );
});

test("useModifyConfig", () => {
  const { result } = renderHook(() => useModifyConfig());
  const first = internal_getCurrentConfig();
  expect(typeof result.current).toBe("function");
  const modifyConfig = result.current;
  act(() => {
    modifyConfig((conf) => {
      conf.timeFormat = 24;
    });
  });
  expect(internal_getCurrentConfig()).not.toBe(first); // referential inequality from immer, for accurate rerendering
  expect(internal_getCurrentConfig().timeFormat).toBe(24);
});
