// my-app/src/components/Pages/Users/Users.jsx
import React from 'react';
import styles from './Users.module.css';
import { Link } from 'react-router-dom';
import { avatarImgUrl } from '../../../utils/ImagesLoadUtil';

const UserItem = ({ user, onFollowToggle, loggedInUserId }) => {
    const handleToggle = () => {
        if (loggedInUserId && user && typeof user.user_id === 'number' && loggedInUserId !== user.user_id) {
             onFollowToggle(user.user_id, user.isFollowedByCurrentUser);
        } else if (!user || typeof user.user_id !== 'number') {
            console.error("UserItem: user or user.user_id is undefined or invalid", user);
        }
    };

    if (!user || typeof user.user_id !== 'number') {
        return null;
    }

    const isProcessing = user.followProcessingForUser === user.user_id;

    return (
        <li className={styles.userItem}>
            <Link to={`/profile/${user.user_id}`} className={styles.userLink}>
                <img
                    src={avatarImgUrl(user.user_avatar_url)}
                    alt={user.displayName || user.userName || 'Avatar'}
                    className={styles.userAvatar}
                    onError={(e) => { e.target.onerror = null; e.target.src="/default_avatar.png"; }}
                />
                <div className={styles.userInfo}>
                    <span className={styles.userName}>{user.displayName || user.userName}</span>
                    {user.userName && <span className={styles.userHandle}>@{user.userName}</span>}
                </div>
            </Link>
            {loggedInUserId && loggedInUserId !== user.user_id && (
                <button
                    onClick={handleToggle}
                    className={`${styles.followButton} ${user.isFollowedByCurrentUser ? styles.unfollowActive : ''}`}
                    disabled={isProcessing}
                >
                    {isProcessing ? '...' : (user.isFollowedByCurrentUser ? 'Відстежуєте' : 'Підписатись')}
                </button>
            )}
        </li>
    );
};

const Users = ({
    users,
    status,
    error,
    onFollowToggle,
    loggedInUserId,
    lastUserElementRef,
    isLoadingMore,
    hasMoreUsers,
    // Нові пропси для вкладок
    activeTab,
    onTabChange,
    canShowPersonalTabs
}) => {
    if (status === 'loading' && (!users || users.length === 0)) {
        return <div className={styles.usersPageContent}><p className={styles.loadingMessage}>Завантаження користувачів...</p></div>;
    }
    const errorMessage = typeof error === 'string' ? error : (error?.error || error?.message || 'Не вдалося завантажити користувачів');
    if (status === 'failed' && (!users || users.length === 0) && error) {
        return <div className={styles.usersPageContent}><p className={styles.errorMessage}>Помилка: {errorMessage}</p></div>;
    }

    let pageTitle = "Користувачі";
    if (activeTab === 'myFollowing') pageTitle = "Ви відстежуєте";
    if (activeTab === 'myFollowers') pageTitle = "Ваші підписники";


    return (
        <div className={styles.usersPageContent}>
            {/* Вкладки */}
            <div className={styles.tabsHeaderUsers}>
                <button
                    className={`${styles.tabButtonUsers} ${activeTab === 'allUsers' ? styles.activeTabUsers : ''}`}
                    onClick={() => onTabChange('allUsers')}
                    disabled={status === 'loading' || status === 'loadingMore'}
                >
                    Всі користувачі
                </button>
                {canShowPersonalTabs && (
                    <>
                        <button
                            className={`${styles.tabButtonUsers} ${activeTab === 'myFollowing' ? styles.activeTabUsers : ''}`}
                            onClick={() => onTabChange('myFollowing')}
                            disabled={status === 'loading' || status === 'loadingMore'}
                        >
                            Відстежуєте
                        </button>
                        <button
                            className={`${styles.tabButtonUsers} ${activeTab === 'myFollowers' ? styles.activeTabUsers : ''}`}
                            onClick={() => onTabChange('myFollowers')}
                            disabled={status === 'loading' || status === 'loadingMore'}
                        >
                            Підписники
                        </button>
                    </>
                )}
            </div>

            {/* Заголовок сторінки (можна прибрати, якщо вкладки достатньо інформативні) */}
            {/* <h1 className={styles.pageTitle}>{pageTitle}</h1> */}

            {(!users || users.length === 0) && status === 'succeeded' && (
                <p className={styles.noUsersMessage}>
                    {activeTab === 'allUsers' ? 'Користувачів не знайдено.' :
                     activeTab === 'myFollowing' ? 'Ви ще нікого не відстежуєте.' :
                     'У вас ще немає підписників.'
                    }
                </p>
            )}

            <ul className={styles.usersList}>
                {users && users.map((user, index) => {
                    if (!user || user.user_id === undefined) {
                        console.warn("[Users.jsx] Attempting to render invalid user object or user without user_id:", user);
                        return null;
                    }
                    const userCard = (
                        <UserItem
                            key={user.user_id || `user-${index}-${Math.random()}`}
                            user={user}
                            onFollowToggle={onFollowToggle}
                            loggedInUserId={loggedInUserId}
                        />
                    );
                     if (users.length === index + 1 && hasMoreUsers) {
                        return <div ref={lastUserElementRef} key={`ref-user-${user.user_id || index}`}>{userCard}</div>;
                    }
                    return userCard;
                })}
            </ul>

            {isLoadingMore && <div className={styles.loadingMore}><p>Завантаження...</p></div>}

            {!hasMoreUsers && users && users.length > 0 && status === 'succeeded' && (
                <p className={styles.endOfListMessage}>Ви переглянули всіх користувачів.</p>
            )}

            {status === 'failed' && users && users.length > 0 && error && (
                <div className={styles.errorLoadingMoreUsers}>
                    <p>Не вдалося завантажити більше: {errorMessage}</p>
                </div>
            )}
        </div>
    );
};

export default Users;