// my-backend-app/src/controllers/notificationsController.ts
import { Request, Response, NextFunction } from "express";
import { getUserLastLogout } from "../models/userModel";
import {
  getNewFollowerNotificationsForUser,
  getNewPostNotificationsForUser,
  getNewMessageNotificationsForUser,
} from "../models/notificationModel"; // Припускаємо, що цей файл та функції існують

const DEFAULT_NOTIFICATION_TIMESPAN_DAYS = 7;

// ========================================================================
// ==                      GET Request Handlers                          ==
// ========================================================================

const getAllNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const currentUserId = req.user?.userID;
  if (!currentUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    let lastLogoutDate = await getUserLastLogout(currentUserId);
    if (!lastLogoutDate) {
      lastLogoutDate = new Date();
      lastLogoutDate.setDate(
        lastLogoutDate.getDate() - DEFAULT_NOTIFICATION_TIMESPAN_DAYS
      );
    }

    const followerNotifications = await getNewFollowerNotificationsForUser(
      currentUserId,
      lastLogoutDate
    );
    const postNotifications = await getNewPostNotificationsForUser(
      currentUserId,
      lastLogoutDate
    );
    const messageNotifications = await getNewMessageNotificationsForUser(
      currentUserId,
      lastLogoutDate
    );

    const formattedFollowers = followerNotifications.map((n: any) => ({
      id: `follow-${n.actor_user_id}-${new Date(n.notification_timestamp).getTime()}`,
      type: n.event_type,
      text: `${n.actor_username} підписався(-лась) на вас.`,
      link: `/profile/${n.actor_user_id}`,
      time: new Date(n.notification_timestamp).toISOString(),
      read: false,
      userAvatarFilename: n.actor_avatar_url,
      userId: n.actor_user_id,
    }));

    const formattedPosts = postNotifications.map((n: any) => ({
      id: `post-${n.target_entity_id}-${new Date(n.notification_timestamp).getTime()}`,
      type: n.event_type,
      text: `${n.actor_username} опублікував новий допис: "${n.post_title_preview}...".`,
      link: `/posts/${n.target_entity_id}`,
      time: new Date(n.notification_timestamp).toISOString(),
      read: false,
      userAvatarFilename: n.actor_avatar_url,
      userId: n.actor_user_id,
    }));

    const formattedMessages = messageNotifications.map((n: any) => ({
      id: `msg-${n.actor_user_id}-${new Date(n.notification_timestamp).getTime()}`,
      type: n.event_type,
      text: `Нові повідомлення (${n.new_messages_count}) від ${n.actor_username}.`,
      link: `/dialogs/${n.actor_user_id}`,
      time: new Date(n.notification_timestamp).toISOString(),
      read: false,
      userAvatarFilename: n.actor_avatar_url,
      userId: n.actor_user_id,
      count: n.new_messages_count,
    }));

    const allNotifications = [
      ...formattedFollowers,
      ...formattedPosts,
      ...formattedMessages,
    ];
    allNotifications.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    res.json(allNotifications);
  } catch (error) {
    next(error);
  }
};

// ========================================================================
// ==                           Exports                                  ==
// ========================================================================

export { getAllNotifications };
