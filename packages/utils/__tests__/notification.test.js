
import { renderHook, act } from "@testing-library/react-hooks";
import { Provider, useNotification, useSendNotification } from '../src';

describe('notification system', () => {
  let subscriberFn = jest.fn();

  function setup(event) {
    return renderHook(() => {
      // set up useNotification to listen for the notification
      useNotification.apply(null, [event, subscriberFn].filter(Boolean));
      // set up useSendNotification
      return useSendNotification();
    }, { wrapper: Provider });
  }

  beforeEach(() => subscriberFn.mockReset());

  test('works', () => {
    const { result } = setup('event');
    // ...and use sendNotification to send out an 'event' notification
    act(() => {
      let sendNotification = result.current;
      sendNotification('event', 'payload');
    });

    expect(subscriberFn).toHaveBeenCalledTimes(1);
    expect(subscriberFn).toHaveBeenCalledWith('payload');
  });

  test('passes type to "*" subscribers"', () => {
    const { result } = setup(undefined); // equivalent to '*'
    act(() => {
      let sendNotification = result.current;
      sendNotification('event', 'payload');
    });

    expect(subscriberFn).toHaveBeenCalledTimes(1);
    expect(subscriberFn).toHaveBeenCalledWith('event', 'payload');
  });
});