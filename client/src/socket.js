import { io } from 'socket.io-client';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || window.location.origin;

const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export default socket;
