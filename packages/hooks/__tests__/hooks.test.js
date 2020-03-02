
import { renderHook, act } from "@testing-library/react-hooks";
import { NotificationProvider, useNotification, useSendNotification } from '../src';

describe('useNotification', () => {
  let subscriberFn = jest.fn();

  function setup(event) {
    return renderHook(() => {
      // set up useNotification to listen for the notification
      useNotification.apply(null, [event, subscriberFn].filter(Boolean));
      // set up useSendNotification
      return useSendNotification();
    }, { wrapper: NotificationProvider });
  }

  beforeEach(() => subscriberFn.mockReset());

  test('works', () => {
    const { result, unmount } = setup('event');
    // ...and use sendNotification to send out an 'event' notification
    act(() => {
      let sendNotification = result.current;
      sendNotification('event', 'payload', 'sender');
    });

    expect(subscriberFn).toHaveBeenCalledTimes(1);
    expect(subscriberFn).toHaveBeenCalledWith('payload', 'sender');
    unmount();
  });

  test('passes type to "*" subscribers"', () => {
    const { result, unmount } = setup(undefined); // equivalent to '*'
    act(() => {
      let sendNotification = result.current;
      sendNotification('event', 'payload', 'sender');
    });

    expect(subscriberFn).toHaveBeenCalledTimes(1);
    expect(subscriberFn).toHaveBeenCalledWith('event', 'payload', 'sender');
    unmount();
  });
});