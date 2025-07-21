import { Socket } from 'socket.io-client';
import { mock } from 'node:test';

export function createMockSocket(): {
  socket: Socket;
  mockOn: ReturnType<typeof mock.fn>;
  mockEmit: ReturnType<typeof mock.fn>;
} {
  const mockOn = mock.fn();
  const mockEmit = mock.fn();

  const socket = {
    on: mockOn,
    off: mock.fn(),
    emit: mockEmit,
    connected: true,
    disconnect: mock.fn(),
  } as unknown as Socket;

  return { socket, mockOn, mockEmit };
}
