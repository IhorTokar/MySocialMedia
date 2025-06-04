// my-app/src/components/Pages/Dialogs/DialogItem/DialogItem.jsx
import React from "react";
import styles from "./../Dialogs.module.css"; // Використовуємо styles замість s
import { avatarImgUrl } from "../../../../utils/ImagesLoadUtil";
import { formatDate } from "../../../../utils/dateUtil"; // Або ваш форматтер

const DialogItem = ({ id, name, avatar, onClick, isActive, lastMessage, lastMessageTime }) => {
  const handleClick = () => {
    onClick(id);
  };

  const truncateMessage = (message, maxLength = 25) => {
    if (!message) return "";
    if (message.length > maxLength) {
      return message.substring(0, maxLength) + "...";
    }
    return message;
  };

  const formattedTime = lastMessageTime ? formatDate(lastMessageTime, { timeOnly: true }) : "";

  return (
    <div
      className={`${styles.dialog} ${isActive ? styles.active : ""}`}
      onClick={handleClick}
    >
      <img 
        src={avatarImgUrl(avatar)} 
        alt={name || 'avatar'} 
        className={styles.dialogAvatar}
        onError={(e) => { e.target.onerror = null; e.target.src="/default_avatar.png";}}
      />
      <div className={styles.dialogInfo}>
        <div className={styles.dialogHeader}>
          <span className={styles.dialogName}>{name}</span>
          {formattedTime && (
            <span className={styles.lastMessageTime}>
              {formattedTime}
            </span>
          )}
        </div>
        {lastMessage && (
          <p className={styles.lastMessage}>{truncateMessage(lastMessage)}</p>
        )}
        {!lastMessage && <p className={styles.lastMessage}>&nbsp;</p>} {/* Заповнювач, щоб висота не стрибала */}
      </div>
    </div>
  );
};

export default DialogItem;