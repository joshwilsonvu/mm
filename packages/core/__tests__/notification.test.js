/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react-hooks";
import { useNotification, sendNotification } from "../src";

test("works", () => {
  let subscriberFn = jest.fn();
  renderHook(() => useNotification("event", subscriberFn));
  // use sendNotification to send out an 'event' notification
  act(() => {
    sendNotification("event", "payload");
  });

  expect(subscriberFn).toHaveBeenCalledTimes(1);
  expect(subscriberFn).toHaveBeenCalledWith("payload");
});

test('passes type to "*" subscribers"', () => {
  let subscriberFn = jest.fn();
  renderHook(() => useNotification("*", subscriberFn));
  act(() => {
    sendNotification("event", "payload");
  });

  expect(subscriberFn).toHaveBeenCalledTimes(1);
  expect(subscriberFn).toHaveBeenCalledWith("event", "payload");
});
