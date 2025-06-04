// my-backend-app/src/controllers/messagesController.ts
import { Request, Response, NextFunction } from "express";
import {
  getMessagesForUser,
  deleteMessageFromDB,
  addMessage,
  getChatsForUser,
  updateMessageInDB,
} from "../models/messageModel";
import { sendMessageToUser } from "../services/websocketService"; // Переконайтесь, що шлях правильний
import path from "path";
import fs from 'fs/promises';



const getUserMessages = async (
  req: Request, // Використовуємо Request, якщо req.user типізовано глобально
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.userID;
  const partnerIdParam = req.query.partnerId as string | undefined; // Приймаємо ID співрозмовника

  if (!userId) {
    res.status(401).json({ error: "Unauthorized: User ID not found in token." });
    return;
  }
  if (!partnerIdParam || isNaN(parseInt(partnerIdParam, 10))) {
    res.status(400).json({ error: "Partner ID is required and must be a number." });
    return;
  }
  const partnerId = parseInt(partnerIdParam, 10);

  try {
    // Тепер getMessagesForUser приймає два ID
    const messages = await getMessagesForUser(userId, partnerId); 
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

const getUserChats = async (
  req: Request, // Використовуємо Request
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.userID;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized: User ID not found in token." });
    return;
  }
  try {
    const chats = await getChatsForUser(userId);
    res.json(chats);
  } catch (error) {
    next(error);
  }
};

const addNewMessage = async (
  req: Request, // Використовуємо Request
  res: Response,
  next: NextFunction
): Promise<void> => {
  const loggedInUserId = req.user?.userID;
  // Фронтенд тепер надсилає messageFilename, а не messageFileContentUrl
  const { receiverID, message, messageFilename } = req.body; 
  const timestamp = new Date().toISOString();
  console.log(`[messagesController][${timestamp}] Received new message request. Sender: ${loggedInUserId}, Receiver: ${receiverID}, File: ${messageFilename}`);


  if (!loggedInUserId) {
    res.status(401).json({ error: "Unauthorized: User ID not found in token." });
    return;
  }
  if (!receiverID) {
    res.status(400).json({ error: "Missing required field: receiverID is required."});
    return;
  }
  // Дозволяємо порожнє текстове повідомлення, якщо є файл
  if ((!message || String(message).trim() === '') && (!messageFilename || String(messageFilename).trim() === '')) {
     res.status(400).json({ error: "Missing required content: message text or messageFilename is required." });
     return;
  }


  try {
    const receiverIdNum = parseInt(receiverID, 10);
    if (isNaN(receiverIdNum)) {
      res.status(400).json({ error: "Invalid receiver ID format. Must be a number." });
      return;
    }
    if (loggedInUserId === receiverIdNum) {
      res.status(400).json({ error: "Sender and receiver cannot be the same user." });
      return;
    }

    const createdMessage = await addMessage(
      loggedInUserId,
      receiverIdNum,
      message || '', // Передаємо порожній рядок, якщо повідомлення немає
      messageFilename // Це ім'я файлу, або null/undefined
    );

    if (createdMessage) {
      // Надсилання через WebSocket (якщо реалізовано)
      // Переконуємося, що createdMessage містить дані для відправника/отримувача для WebSocket
      sendMessageToUser(loggedInUserId, createdMessage); // Відправляємо собі для оновлення UI
      sendMessageToUser(receiverIdNum, createdMessage);  // Відправляємо отримувачу
      
      console.log(`[messagesController][${timestamp}] Message sent and saved:`, createdMessage);
      res.status(201).json(createdMessage);
    } else {
      console.error(`[messagesController][${timestamp}] Failed to save message or retrieve details after saving.`);
      res.status(500).json({ error: "Failed to save the message or retrieve the created message details." });
    }
  } catch (error) {
    console.error(`[messagesController][${timestamp}] Error in addNewMessage:`, error);
    next(error);
  }
};

const deleteMessage = async (
  req: Request, // Повинен бути ваш глобальний тип Request, що знає про req.user
  res: Response,
  next: NextFunction
): Promise<void> => {
  const loggedInUserId = req.user?.userID;
  const messageIdParam = req.params.messageId;
  const messageID = parseInt(messageIdParam, 10);

  if (!loggedInUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (isNaN(messageID)) {
    res.status(400).json({ error: "Invalid Message ID format. Must be a number." });
    return;
  }

  try {
    const success = await deleteMessageFromDB(messageID, loggedInUserId);
    if (success) { // Модель повертає true при успіху
        res.status(200).json({ message: "Message deleted successfully" });
    } else {
        // Цей блок не мав би спрацювати, якщо модель кидає помилку при невдачі
        res.status(500).json({ message: "Message deletion may not have occurred."});
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Message not found")) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error && error.message.includes("Forbidden")) {
      res.status(403).json({ error: error.message });
    } else {
      next(error);
    }
  }
};

const updateMessage = async (
  req: Request, // Якщо використовуєте глобальні типи, req.user буде доступний
  res: Response,
  next: NextFunction
): Promise<void> => {
  const messageIdToUpdate = parseInt(req.params.messageId, 10);
  const currentUserId = req.user?.userID;
  const { message: newText, messageFilename: newMessageFilenameAction } = req.body;
  // newMessageFilenameAction може бути:
  // - undefined: якщо зображення не чіпається (і нового файлу немає)
  // - null: якщо фронтенд сигналізує про видалення зображення без заміни
  // - string: (теоретично, якщо фронтенд дозволяє заміну зображення, але ми поки це не реалізовуємо)
  
  const timestamp = new Date().toISOString();
  console.log(`[messagesController][${timestamp}] Attempting to update message ID: ${messageIdToUpdate} by user ID: ${currentUserId}. New text: "${newText}", Image action: ${newMessageFilenameAction}`);

  if (isNaN(messageIdToUpdate)) {
    res.status(400).json({ error: "Invalid Message ID." });
    return;
  }
  if (!currentUserId) {
    res.status(401).json({ error: "Unauthorized. User not authenticated." });
    return;
  }

  // Перевіряємо, чи є що оновлювати
  if (newText === undefined && newMessageFilenameAction === undefined) {
    res.status(400).json({ error: "No data provided for update (text or image action)." });
    return;
  }

  try {
    // Функція моделі updateMessageInDB оновлює БД і повертає старе ім'я файлу та оновлене повідомлення
    // newMessageFilenameAction (з req.body) тут передається як newImageFilename в модель
    const { oldFilename, updatedMessage } = await updateMessageInDB(
      messageIdToUpdate,
      currentUserId,
      newText, // Може бути undefined, якщо оновлюється тільки зображення (або видаляється)
      newMessageFilenameAction // undefined (не чіпати), null (видалити)
    );

    // Якщо зображення було видалено (newMessageFilenameAction === null) або замінено (не наш випадок зараз)
    // і існувало старе зображення, видаляємо його з сервера.
    if (newMessageFilenameAction === null && oldFilename && oldFilename.trim() !== '') {
      const safeOldFilename = path.basename(oldFilename);
      const oldImageServerPath = path.resolve(__dirname, '../../uploads/message_files', safeOldFilename);
      try {
        await fs.access(oldImageServerPath);
        await fs.unlink(oldImageServerPath);
        console.log(`[messagesController][${timestamp}] Successfully deleted old message image: ${oldImageServerPath}`);
      } catch (unlinkError) {
        // @ts-ignore
        if (unlinkError.code === 'ENOENT') {
             console.warn(`[messagesController][${timestamp}] Old message image not found for deletion: ${oldImageServerPath}`);
        } else {
            console.warn(`[messagesController][${timestamp}] Could not delete old message image '${oldImageServerPath}':`, (unlinkError as Error).message);
        }
      }
    }

    if (updatedMessage) {
      // Надсилаємо оновлене повідомлення через WebSocket всім учасникам чату
      sendMessageToUser(updatedMessage.senderID, { type: 'message_updated', payload: updatedMessage });
      sendMessageToUser(updatedMessage.receiverID, { type: 'message_updated', payload: updatedMessage });
      
      res.status(200).json(updatedMessage);
    } else {
      // Це може статися, якщо updateMessageInDB повернула null (наприклад, нічого не змінилося)
      // або якщо getSingleMessageById не знайшло оновлене повідомлення
      res.status(404).json({ error: "Message updated, but could not retrieve updated data." });
    }

  } catch (error) {
    if (error instanceof Error && (error.message.includes("not found") || error.message.includes("Forbidden"))) {
      res.status(error.message.includes("Forbidden") ? 403 : 404).json({ error: error.message });
      return;
    }
    next(error);
  }
};

export { getUserMessages, addNewMessage, deleteMessage, getUserChats, updateMessage };