/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react-hooks";
import {
  useCurrentConfig,
  useSetConfig,
  useModifyConfig,
  private_setCurrentConfig,
  private_getCurrentConfig,
} from "../src";

const initialConfig = { port: 8080, timeFormat: 12 };

beforeEach(() => private_setCurrentConfig(initialConfig));

test("useCurrentConfig", () => {
  const { result, rerender } = renderHook(() => useCurrentConfig());
  expect(result.current).toEqual(
    expect.objectContaining({
      port: 8080,
      timeFormat: 12,
    })
  );
  expect(result.current).toBe(private_getCurrentConfig());
  const first = private_getCurrentConfig();
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
  expect(private_getCurrentConfig()).toEqual(
    expect.objectContaining(newConfig)
  );
});

test("useModifyConfig", () => {
  const { result } = renderHook(() => useModifyConfig());
  const first = private_getCurrentConfig();
  expect(typeof result.current).toBe("function");
  const modifyConfig = result.current;
  act(() => {
    modifyConfig((conf) => {
      conf.timeFormat = 24;
    });
  });
  expect(private_getCurrentConfig()).not.toBe(first); // referential inequality from immer, for accurate rerendering
  expect(private_getCurrentConfig().timeFormat).toBe(24);
});
