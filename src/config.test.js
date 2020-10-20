/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react-hooks";
import {
  useCurrentConfig,
  getCurrentConfig,
  setCurrentConfig,
  modifyCurrentConfig,
} from "./config";

const initialConfig = { port: 8080, timeFormat: 12 };

beforeEach(() => setCurrentConfig(initialConfig));

test("useCurrentConfig", () => {
  const { result, rerender } = renderHook(() => useCurrentConfig());
  expect(result.current).toEqual(expect.objectContaining(initialConfig));
  expect(result.current).toBe(getCurrentConfig());
  const first = getCurrentConfig();
  rerender();
  expect(first).toBe(result.current); // referential equality
});

test("setCurrentConfig", () => {
  const { result } = renderHook(() => useCurrentConfig());
  expect(result.current).toEqual(expect.objectContaining(initialConfig));

  const newConfig = {
    language: "fr",
    timeFormat: 24,
    units: "imperial",
    modules: [],
  };
  act(() => {
    setCurrentConfig((oldConfig) => ({
      ...oldConfig,
      ...newConfig,
    }));
  });

  expect(result.current).toEqual(expect.objectContaining(newConfig));
});

test("useModifyConfig", () => {
  const { result } = renderHook(() => useCurrentConfig());
  expect(result.current).toEqual(expect.objectContaining(initialConfig));
  const first = getCurrentConfig();
  expect(result.current).toBe(first);

  act(() => {
    modifyCurrentConfig((conf) => {
      conf.timeFormat = 24;
    });
  });

  expect(result.current.timeFormat).toBe(24);
  expect(result.current).not.toBe(first); // referential inequality for rerendering
});
