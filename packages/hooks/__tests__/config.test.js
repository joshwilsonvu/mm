/**
 * @jest-environment jsdom
 */

import React from "react";
import { renderHook, act } from "@testing-library/react-hooks";
import { ConfigProvider, useCurrentConfig, useSetConfig, useModifyConfig } from '../src';
import { initializeConfig } from "@mm/core";

const initialConfig = { port: 8080, timeFormat: 12 };
let currentConfig;

function Wrapper({ children }) {
  const [config, setConfig] = React.useState(() => initializeConfig(initialConfig));
  currentConfig = config;
  return (
    <ConfigProvider config={config} setConfig={setConfig}>
      {children}
    </ConfigProvider>
  )
}

beforeEach(() => currentConfig = void 0);

test('useCurrentConfig', () => {
  const { result, rerender } = renderHook(() => useCurrentConfig(), {
    wrapper: Wrapper
  });
  expect(result.current).toEqual({
    language: 'en',
    timeFormat: 12,
    units: 'metric',
    modules: [],
  });
  expect(result.current).toBe(currentConfig);
  const first = currentConfig;
  rerender();
  expect(first).toBe(result.current); // referential equality
});

test('useSetConfig', () => {
  const { result } = renderHook(() => useSetConfig(), {
    wrapper: Wrapper
  });
  expect(typeof result.current).toBe("function");
  const setConfig = result.current;
  const newConfig = {
    language: 'fr',
    timeFormat: 24,
    units: 'imperial',
    modules: [],
  };
  act(() => {
    setConfig(newConfig);
  });
  expect(newConfig).toEqual(currentConfig);
});

test('useModifyConfig', () => {
  const { result } = renderHook(() => useModifyConfig(), {
    wrapper: Wrapper
  });
  const first = currentConfig;
  expect(typeof result.current).toBe("function");
  const modifyConfig = result.current;
  act(() => {
    modifyConfig(conf => {
      conf.timeFormat = 24;
    });
  });
  expect(currentConfig).not.toBe(first); // referential inequality from immer, for accurate rerendering
  expect(currentConfig.timeFormat).toBe(24);
});