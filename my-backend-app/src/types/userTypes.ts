export type UserPrivate = {
    user_id: number;
    email: string;
    password_hash: string;
    role: string;
     date_of_birth: string;
  };
export type UserPublic = {
    user_id: number;
    userName: string;
    displayName:string;
    uid:string;
    profile_picture_url: string | null;
    gender:string;
    user_avatar_url: string | null;
    about_me: string;
}

export interface AdminUserDetailsUpdatePayload { // Можна винести в типи
  username?: string;
  display_name?: string;
  about_me?: string;
  gender?: string;
  email?: string;
  phone?: string;
}

export type UserListItem = UserPublic & { 
  isFollowedByCurrentUser: boolean; 
  created_at?: Date; // created_at є в UserPublic, але тут для ясності
};

// Тип для відповіді пагінованих функцій, що повертають списки користувачів
export type PaginatedUserListResponse = { 
  users: UserListItem[]; 
  totalCount: number; 
};