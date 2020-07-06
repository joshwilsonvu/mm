/**
 * @jest-environment jsdom
 */

import React from "react";
import { renderHook, act } from "@testing-library/react-hooks";
import {
  useCurrentConfig,
  useSetConfig,
  useModifyConfig,
  initializeConfig,
  ConfigProvider,
} from "../src";

const initialConfig = { port: 8080, timeFormat: 12 };
let currentConfig;

function Wrapper({ children }) {
  const [config, setConfig] = React.useState(() =>
    initializeConfig(initialConfig)
  );
  currentConfig = config;
  return (
    <ConfigProvider config={config} setConfig={setConfig}>
      {children}
    </ConfigProvider>
  );
}

beforeEach(() => (currentConfig = void 0));

test("useCurrentConfig", () => {
  const { result, rerender } = renderHook(() => useCurrentConfig(), {
    wrapper: Wrapper,
  });
  expect(result.current).toEqual(
    expect.objectContaining({
      port: 8080,
      timeFormat: 12,
    })
  );
  expect(result.current).toBe(currentConfig);
  const first = currentConfig;
  rerender();
  expect(first).toBe(result.current); // referential equality
});

test("useSetConfig", () => {
  const { result } = renderHook(() => useSetConfig(), {
    wrapper: Wrapper,
  });
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
  expect(currentConfig).toEqual(expect.objectContaining(newConfig));
});

test("useModifyConfig", () => {
  const { result } = renderHook(() => useModifyConfig(), {
    wrapper: Wrapper,
  });
  const first = currentConfig;
  expect(typeof result.current).toBe("function");
  const modifyConfig = result.current;
  act(() => {
    modifyConfig((conf) => {
      conf.timeFormat = 24;
    });
  });
  expect(currentConfig).not.toBe(first); // referential inequality from immer, for accurate rerendering
  expect(currentConfig.timeFormat).toBe(24);
});
