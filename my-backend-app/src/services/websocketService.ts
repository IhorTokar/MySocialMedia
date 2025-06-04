import WebSocket, { WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http'; // Імпортуємо тип HttpServer
import jwt, { JwtPayload } from 'jsonwebtoken';
import url from 'url';

const JWT_SECRET = process.env.JWT_SECRET;

// Тип для збережених клієнтів (UserId -> WebSocket Instance)
interface WebSocketClients {
  [userId: number]: WebSocket;
}

// Зберігаємо активні з'єднання
const clients: WebSocketClients = {};
let wss: WebSocketServer | null = null;

/**
 * Ініціалізує WebSocket сервер.
 * @param httpServer - Екземпляр HTTP сервера.
 */
export const initializeWebSocket = (httpServer: HttpServer): void => {
  if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not set. WebSocket server cannot start.');
    return;
  }

  console.log('Initializing WebSocket Server...');
  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: WebSocket, req) => {
    let userId: number | null = null;
    try {
      // Автентифікація через токен в URL параметрі (?token=...)
      const parameters = url.parse(req.url || '', true).query;
      const token = parameters.token as string;

      if (!token) {
        console.warn('WebSocket: Connection attempt without token. Closing.');
        ws.close(1008, 'Token required');
        return;
      }

      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { userID: number };
      userId = decoded.userID;

      // Перевірка, чи користувач вже підключений (закриваємо старе з'єднання)
      if (clients[userId]) {
          console.warn(`WebSocket: User ${userId} connected again. Closing previous connection.`);
          clients[userId].close(1012, 'New connection established'); // 1012 = Service Restart
      }


      console.log(`WebSocket: Client connected - User ${userId}`);
      clients[userId] = ws; // Зберігаємо нове з'єднання

      ws.send(JSON.stringify({ type: 'connection_ack', message: `Connected as user ${userId}` }));

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('WebSocket: Authentication failed:', message);
      ws.close(1008, `Authentication failed: ${message}`);
      return;
    }

    // Обробники подій
    ws.on('message', (message: Buffer) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        console.log(`WebSocket: Received message from User ${userId}:`, parsedMessage);
        // TODO: Додати логіку обробки повідомлень від клієнта (typing, read status etc.)
      } catch (e) {
        console.error(`WebSocket: Failed to parse message from User ${userId}:`, message.toString());
      }
    });

    ws.on('close', (code, reason) => {
      if (userId && clients[userId] === ws) { // Переконуємось, що видаляємо правильне з'єднання
          console.log(`WebSocket: Client disconnected - User ${userId}. Code: ${code}, Reason: ${reason.toString()}`);
          delete clients[userId];
      } else {
          console.log(`WebSocket: Unauthenticated or obsolete client disconnected. Code: ${code}, Reason: ${reason.toString()}`);
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket: Error for User ${userId || 'unauthenticated'}:`, error);
      if (userId && clients[userId] === ws) {
        delete clients[userId];
      }
      // Не потрібно викликати ws.close() тут, подія 'close' спрацює автоматично
    });
  });

  wss.on('error', (error) => {
    console.error('WebSocket Server Error:', error);
    wss = null;
  });

  console.log('WebSocket Server initialized.');
};

/**
 * Надсилає дані конкретному користувачу через WebSocket.
 * @param targetUserId - ID користувача-отримувача.
 * @param data - Дані для надсилання (будуть загорнуті в { type: '...', payload: data }).
 * @param type - Тип повідомлення (за замовчуванням 'new_message').
 * @returns true, якщо користувач онлайн і повідомлення надіслано, інакше false.
 */
export const sendMessageToUser = (targetUserId: number, data: any, type: string = 'new_message'): boolean => {
  const targetClient = clients[targetUserId];

  if (targetClient && targetClient.readyState === WebSocket.OPEN) {
    try {
        targetClient.send(JSON.stringify({ type: type, payload: data }));
        console.log(`WebSocket: Message type '${type}' sent to User ${targetUserId}`);
        return true;
    } catch (error) {
        console.error(`WebSocket: Failed to send message to User ${targetUserId}:`, error);
        return false;
    }
  } else {
    console.log(`WebSocket: User ${targetUserId} is not connected.`);
    return false;
  }
};