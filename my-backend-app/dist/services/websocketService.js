"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageToUser = exports.initializeWebSocket = void 0;
const ws_1 = __importStar(require("ws"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const url_1 = __importDefault(require("url"));
const JWT_SECRET = process.env.JWT_SECRET;
// Зберігаємо активні з'єднання
const clients = {};
let wss = null;
/**
 * Ініціалізує WebSocket сервер.
 * @param httpServer - Екземпляр HTTP сервера.
 */
const initializeWebSocket = (httpServer) => {
    if (!JWT_SECRET) {
        console.error('FATAL ERROR: JWT_SECRET is not set. WebSocket server cannot start.');
        return;
    }
    console.log('Initializing WebSocket Server...');
    wss = new ws_1.WebSocketServer({ server: httpServer });
    wss.on('connection', (ws, req) => {
        let userId = null;
        try {
            // Автентифікація через токен в URL параметрі (?token=...)
            const parameters = url_1.default.parse(req.url || '', true).query;
            const token = parameters.token;
            if (!token) {
                console.warn('WebSocket: Connection attempt without token. Closing.');
                ws.close(1008, 'Token required');
                return;
            }
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            userId = decoded.userID;
            // Перевірка, чи користувач вже підключений (закриваємо старе з'єднання)
            if (clients[userId]) {
                console.warn(`WebSocket: User ${userId} connected again. Closing previous connection.`);
                clients[userId].close(1012, 'New connection established'); // 1012 = Service Restart
            }
            console.log(`WebSocket: Client connected - User ${userId}`);
            clients[userId] = ws; // Зберігаємо нове з'єднання
            ws.send(JSON.stringify({ type: 'connection_ack', message: `Connected as user ${userId}` }));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('WebSocket: Authentication failed:', message);
            ws.close(1008, `Authentication failed: ${message}`);
            return;
        }
        // Обробники подій
        ws.on('message', (message) => {
            try {
                const parsedMessage = JSON.parse(message.toString());
                console.log(`WebSocket: Received message from User ${userId}:`, parsedMessage);
                // TODO: Додати логіку обробки повідомлень від клієнта (typing, read status etc.)
            }
            catch (e) {
                console.error(`WebSocket: Failed to parse message from User ${userId}:`, message.toString());
            }
        });
        ws.on('close', (code, reason) => {
            if (userId && clients[userId] === ws) { // Переконуємось, що видаляємо правильне з'єднання
                console.log(`WebSocket: Client disconnected - User ${userId}. Code: ${code}, Reason: ${reason.toString()}`);
                delete clients[userId];
            }
            else {
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
exports.initializeWebSocket = initializeWebSocket;
/**
 * Надсилає дані конкретному користувачу через WebSocket.
 * @param targetUserId - ID користувача-отримувача.
 * @param data - Дані для надсилання (будуть загорнуті в { type: '...', payload: data }).
 * @param type - Тип повідомлення (за замовчуванням 'new_message').
 * @returns true, якщо користувач онлайн і повідомлення надіслано, інакше false.
 */
const sendMessageToUser = (targetUserId, data, type = 'new_message') => {
    const targetClient = clients[targetUserId];
    if (targetClient && targetClient.readyState === ws_1.default.OPEN) {
        try {
            targetClient.send(JSON.stringify({ type: type, payload: data }));
            console.log(`WebSocket: Message type '${type}' sent to User ${targetUserId}`);
            return true;
        }
        catch (error) {
            console.error(`WebSocket: Failed to send message to User ${targetUserId}:`, error);
            return false;
        }
    }
    else {
        console.log(`WebSocket: User ${targetUserId} is not connected.`);
        return false;
    }
};
exports.sendMessageToUser = sendMessageToUser;
