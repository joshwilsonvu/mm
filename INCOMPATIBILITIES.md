* Potentially calls `start()` on modules before all of them have been mounted.

* Does not expose `Module.definitions` as new-style modules don't register with `Module`
