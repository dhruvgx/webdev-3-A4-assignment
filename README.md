# Chat App

- `server.js` – original backend, **unchanged**.
- `server-rooms.js` – same events + extra features (usernames, message relay, personal rooms with optional password, member list, typing indicator).
- `client.html` – the frontend.

## Run
```
npm install
node server-rooms.js
```
Open http://localhost:8080 in two or more browser tabs.

Note: the original `server.js` only logs `msg` and never relays messages, so chatting between users needs `server-rooms.js`.
