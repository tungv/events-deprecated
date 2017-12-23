# heq - hybrid event queue

The core concept is to implement a simple message queue with that

1. uses HTTP as the only protocol
2. does not store any knowledge about its clients
3. allows clients to start subscribing from any recent point in time
