// my-app/src/redux/postsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Початковий стан для одного пагінованого списку
const initialPaginatedFeedState = {
  items: [],
  currentPage: 0,
  totalPages: 0,
  totalItems: 0,
  limit: 10, // Дефолтний ліміт, може бути змінений для конкретної стрічки
  hasMore: true,
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' | 'loadingMore'
  error: null,
  feedType: null, // Наприклад, 'mainFeed', 'userPosts-123', 'followingFeed'
};

const initialState = {
  mainFeed: { ...initialPaginatedFeedState, feedType: "mainFeed", limit: 10 },
  userPosts: {
    // Динамічно додаватимуться ключі [userId]: { ...initialPaginatedFeedState, ... }
    commonLimit: 10, // Загальний ліміт для стрічок постів користувачів, якщо не вказано інше
  },
  followingFeed: {
    ...initialPaginatedFeedState,
    feedType: "followingFeed",
    limit: 10,
  },
  popularPosts: {
    ...initialPaginatedFeedState,
    limit: 5,
    feedType: "popularPosts",
  }, // Ліміт для популярних може бути іншим
  savedPostsFeed: {
    ...initialPaginatedFeedState,
    feedType: "savedPostsFeed",
    limit: 10,
  },
  searchedPosts: {
    ...initialPaginatedFeedState,
    query: "",
    feedType: "searchedPosts",
    limit: 10,
  },

  // Статуси для окремих дій над постами
  likeStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  likeError: null, // Об'єкт { postId, message }
  saveActionStatus: "idle",
  saveActionError: null,
  addPostStatus: "idle",
  addPostError: null,
  deletePostStatus: "idle",
  deletePostError: null, // Об'єкт { postId, message }
  updatePostStatus: "idle",
  updatePostError: null, // Об'єкт { postId, message }
};

// Async Thunks
export const fetchPosts = createAsyncThunk(
  "posts/fetchPosts",
  async (
    { page = 1, limit = initialState.mainFeed.limit } = {},
    { getState, rejectWithValue }
  ) => {
    const timestamp = new Date().toISOString();
    console.log(
      `[postsSlice][${timestamp}] Fetching main feed posts. Page: ${page}, Limit: ${limit}`
    );
    try {
      const token = getState().auth.token;
      const response = await axios.get(`${API_BASE_URL}/posts`, {
        params: { page, limit },
        withCredentials: !!token, // Надсилаємо кукі, якщо є токен
      });
      // Очікуємо { posts: [], currentPage, totalPages, totalItems }
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to fetch posts";
      return rejectWithValue({ error: errorMessage, page });
    }
  }
);

export const fetchUserPosts = createAsyncThunk(
  "posts/fetchUserPosts",
  async (
    { userId, page = 1, limit = initialState.userPosts.commonLimit } = {},
    { getState, rejectWithValue }
  ) => {
    const timestamp = new Date().toISOString();
    console.log(
      `[postsSlice][${timestamp}] Fetching posts for user: ${userId}. Page: ${page}, Limit: ${limit}`
    );
    try {
      const token = getState().auth.token;
      const response = await axios.get(`${API_BASE_URL}/posts/user/${userId}`, {
        params: { page, limit },
        withCredentials: !!token,
      });
      return { ...response.data, userId }; // Додаємо userId до payload для ідентифікації стрічки
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to fetch user posts";
      return rejectWithValue({ error: errorMessage, userId, page });
    }
  }
);

export const fetchFollowingPosts = createAsyncThunk(
  "posts/fetchFollowingPosts",
  async (
    { page = 1, limit = initialState.followingFeed.limit } = {},
    { getState, rejectWithValue }
  ) => {
    const timestamp = new Date().toISOString();
    console.log(
      `[postsSlice][${timestamp}] Fetching following feed. Page: ${page}, Limit: ${limit}`
    );
    try {
      const token = getState().auth.token;
      if (!token)
        return rejectWithValue({
          error: "Not authenticated for following feed",
          page,
        });
      const response = await axios.get(`${API_BASE_URL}/posts/feed/following`, {
        params: { page, limit },
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to fetch following feed";
      return rejectWithValue({ error: errorMessage, page });
    }
  }
);

export const fetchPopularPosts = createAsyncThunk(
  "posts/fetchPopularPosts",
  async (
    { page = 1, limit = initialState.popularPosts.limit } = {},
    { getState, rejectWithValue }
  ) => {
    const timestamp = new Date().toISOString();
    const token = getState().auth.token;
    console.log(
      `[postsSlice][${timestamp}] Fetching POPULAR posts. Page: ${page}, Limit: ${limit}. Token in Redux: ${!!token}`
    );
    try {
      const response = await axios.get(`${API_BASE_URL}/posts/popular`, {
        params: { page, limit },
        withCredentials: !!token,
      });
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to fetch popular posts";
      console.error(
        `[postsSlice][${timestamp}] Error fetching POPULAR posts:`,
        errorMessage,
        error.response
      );
      return rejectWithValue({ error: errorMessage, page });
    }
  }
);

export const fetchSavedPosts = createAsyncThunk(
  "posts/fetchSavedPosts",
  async (
    { page = 1, limit = initialState.savedPostsFeed.limit } = {},
    { getState, rejectWithValue }
  ) => {
    const timestamp = new Date().toISOString();
    console.log(
      `[postsSlice][${timestamp}] Fetching saved posts. Page: ${page}, Limit: ${limit}`
    );
    try {
      const token = getState().auth.token;
      if (!token)
        return rejectWithValue({
          error: "Not authenticated for saved posts",
          page,
        });
      const response = await axios.get(`${API_BASE_URL}/users/me/saved-posts`, {
        params: { page, limit },
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to fetch saved posts";
      return rejectWithValue({ error: errorMessage, page });
    }
  }
);

export const searchPosts = createAsyncThunk(
  "posts/searchPosts",
  async (
    { query, page = 1, limit = initialState.searchedPosts.limit },
    { getState, rejectWithValue }
  ) => {
    const timestamp = new Date().toISOString();
    console.log(
      `[postsSlice][${timestamp}] Searching posts. Query: "${query}", Page: ${page}, Limit: ${limit}`
    );
    try {
      const token = getState().auth.token;
      const response = await axios.get(`${API_BASE_URL}/posts/search`, {
        params: { q: query, page, limit },
        withCredentials: !!token,
      });
      return { ...response.data, query }; // Додаємо query до payload
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to search posts";
      return rejectWithValue({ error: errorMessage, query, page });
    }
  }
);

export const addPost = createAsyncThunk(
  "posts/addPost",
  async (postData, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue("User not authenticated");
      const formData = new FormData();
      formData.append("title", postData.title || "");
      formData.append("content", postData.content || "");
      if (postData.contentImg instanceof File) {
        // Перевірка, що це файл
        formData.append("contentImg", postData.contentImg);
      }
      const response = await axios.post(`${API_BASE_URL}/posts`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      // Очікуємо, що бекенд поверне повний об'єкт створеного поста
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || error.message || "Failed to add post"
      );
    }
  }
);

export const deletePostById = createAsyncThunk(
  "posts/deletePostById",
  async ({ postId, userId }, { getState, rejectWithValue }) => {
    // userId автора поста, для оновлення userPosts
    try {
      const token = getState().auth.token;
      if (!token)
        return rejectWithValue({ message: "User not authenticated", postId });
      await axios.delete(`${API_BASE_URL}/posts/${postId}`, {
        withCredentials: true,
      });
      return { postId, userId }; // Повертаємо userId автора для коректного оновлення стрічок
    } catch (error) {
      return rejectWithValue({
        message:
          error.response?.data?.error ||
          error.message ||
          "Failed to delete post",
        postId,
      });
    }
  }
);

export const updatePostById = createAsyncThunk(
  "posts/updatePostById",
  async (
    { postId, updateData, newImageFile, deleteCurrentImage },
    { getState, rejectWithValue }
  ) => {
    try {
      const token = getState().auth.token;
      if (!token)
        return rejectWithValue({ message: "User not authenticated", postId });

      const dataToSend = new FormData();
      let hasActualChanges = false;

      if (updateData.title !== undefined) {
        dataToSend.append("title", updateData.title);
        hasActualChanges = true;
      }
      if (updateData.content !== undefined) {
        dataToSend.append("content", updateData.content);
        hasActualChanges = true;
      }

      if (newImageFile instanceof File) {
        dataToSend.append("contentImg", newImageFile);
        hasActualChanges = true;
      } else if (deleteCurrentImage === true) {
        // Явна перевірка на true
        dataToSend.append("deleteContentImg", "true");
        hasActualChanges = true;
      }

      if (!hasActualChanges) {
        console.warn(
          `[postsSlice] updatePostById: No actual changes to submit for post ${postId}.`
        );
        const existingPost = Object.values(getState().posts)
          .filter(
            (feed) =>
              feed && typeof feed === "object" && Array.isArray(feed.items)
          )
          .flatMap((feed) => feed.items)
          .find((p) => p.postId === postId);
        if (existingPost) return existingPost;
        return rejectWithValue({
          message: "No changes submitted and post not found in current state",
          postId,
        });
      }

      const response = await axios.put(
        `${API_BASE_URL}/posts/${postId}`,
        dataToSend,
        {
          withCredentials: true,
        }
      );
      return response.data; // Очікуємо оновлений об'єкт поста
    } catch (error) {
      return rejectWithValue({
        message:
          error.response?.data?.error ||
          error.message ||
          "Failed to update post",
        postId,
      });
    }
  }
);

export const likePost = createAsyncThunk(
  "posts/likePost",
  async (postId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token)
        return rejectWithValue({ message: "Not authenticated", postId });
      const response = await axios.post(
        `${API_BASE_URL}/posts/${postId}/like`,
        {},
        { withCredentials: true }
      );
      return response.data.post; // Очікуємо оновлений пост
    } catch (e) {
      return rejectWithValue({
        message: e.response?.data?.error || e.message || "Failed to like post",
        postId,
      });
    }
  }
);

export const unlikePost = createAsyncThunk(
  "posts/unlikePost",
  async (postId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token)
        return rejectWithValue({ message: "Not authenticated", postId });
      const response = await axios.delete(
        `${API_BASE_URL}/posts/${postId}/like`,
        { withCredentials: true }
      );
      return response.data.post; // Очікуємо оновлений пост
    } catch (e) {
      return rejectWithValue({
        message:
          e.response?.data?.error || e.message || "Failed to unlike post",
        postId,
      });
    }
  }
);

export const savePost = createAsyncThunk(
  "posts/savePost",
  async (postId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token)
        return rejectWithValue({ message: "Not authenticated", postId });
      const response = await axios.post(
        `${API_BASE_URL}/posts/${postId}/save`,
        {},
        { withCredentials: true }
      );
      return response.data.post; // Очікуємо оновлений пост
    } catch (e) {
      return rejectWithValue({
        message: e.response?.data?.error || e.message || "Failed to save post",
        postId,
      });
    }
  }
);

export const unsavePost = createAsyncThunk(
  "posts/unsavePost",
  async (postId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token)
        return rejectWithValue({ message: "Not authenticated", postId });
      const response = await axios.delete(
        `${API_BASE_URL}/posts/${postId}/save`,
        { withCredentials: true }
      );
      return response.data.post; // Очікуємо оновлений пост
    } catch (e) {
      return rejectWithValue({
        message:
          e.response?.data?.error || e.message || "Failed to unsave post",
        postId,
      });
    }
  }
);

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    resetPostsFeed: (state, action) => {
      const feedType = action.payload?.feedType;
      const userId = action.payload?.userId; // Для userPosts
      const query = action.payload?.query; // Для searchedPosts

      if (!feedType) {
        console.warn("[postsSlice] resetPostsFeed called without feedType.");
        return;
      }

      // Визначаємо дефолтний ліміт для конкретної стрічки або загальний дефолт
      const defaultLimitForFeed =
        initialState[feedType]?.limit || initialPaginatedFeedState.limit;

      if (feedType === "userPosts" && userId) {
        if (!state.userPosts)
          state.userPosts = {
            commonLimit: initialState.userPosts?.commonLimit || 10,
          };
        // Використовуємо commonLimit для нової стрічки користувача або існуючий, якщо є
        const userFeedLimit =
          state.userPosts[userId]?.limit || state.userPosts.commonLimit || 10;
        state.userPosts[userId] = {
          ...initialPaginatedFeedState,
          feedType: `userPosts-${userId}`,
          limit: userFeedLimit,
        };
      } else if (feedType === "searchedPosts") {
        state.searchedPosts = {
          ...initialPaginatedFeedState,
          query: query || "",
          feedType: "searchedPosts",
          limit: initialState.searchedPosts?.limit || defaultLimitForFeed,
        };
      } else if (
        state[feedType] &&
        typeof state[feedType] === "object" &&
        "items" in state[feedType]
      ) {
        const originalLimit = state[feedType].limit; // Зберігаємо кастомний ліміт, якщо він був
        state[feedType] = {
          ...initialPaginatedFeedState,
          limit: originalLimit,
          feedType: feedType,
        };
      } else {
        console.warn(
          `[postsSlice] resetPostsFeed: Unknown or invalid feedType or structure for "${feedType}"`
        );
        return;
      }
      console.log(
        `[postsSlice] Resetting feed: ${action.payload.feedType}${userId ? `-${userId}` : ""}`
      );
    },
    clearAllPostsData: (state) => {
      Object.keys(initialState).forEach((key) => {
        if (key === "userPosts") {
          state.userPosts = { commonLimit: initialState.userPosts.commonLimit };
        } else if (
          initialState[key] &&
          typeof initialState[key] === "object" &&
          "items" in initialState[key]
        ) {
          state[key] = {
            ...initialPaginatedFeedState,
            items: [], // Явно очищаємо items
            currentPage: 0,
            limit: initialState[key].limit, // Відновлюємо дефолтний ліміт для цієї стрічки
            feedType: initialState[key].feedType,
            ...(key === "searchedPosts" && { query: "" }), // Для searchedPosts скидаємо query
          };
        } else if (key.endsWith("Status") || key.endsWith("Error")) {
          // Скидаємо статуси окремих дій
          state[key] = initialState[key];
        }
      });
      console.log(
        "[postsSlice] All posts data (feeds and action statuses) cleared/reset."
      );
    },
    resetLikeStatus: (state) => {
      state.likeStatus = "idle";
      state.likeError = null;
    },
    resetSaveActionStatus: (state) => {
      state.saveActionStatus = "idle";
      state.saveActionError = null;
    },
    resetAddPostStatus: (state) => {
      state.addPostStatus = "idle";
      state.addPostError = null;
    },
    resetDeletePostStatus: (state) => {
      state.deletePostStatus = "idle";
      state.deletePostError = null;
    },
    resetUpdatePostStatus: (state) => {
      state.updatePostStatus = "idle";
      state.updatePostError = null;
    },
    updatePostInFeeds: (state, action) => {
      const updatedPost = action.payload;
      if (updatedPost && updatedPost.postId !== undefined) {
        const updateInSingleFeed = (feed) => {
          if (feed && feed.items && Array.isArray(feed.items)) {
            const index = feed.items.findIndex(
              (p) => p.postId === updatedPost.postId
            );
            if (index !== -1) {
              feed.items[index] = { ...feed.items[index], ...updatedPost };
            }
          }
        };

        updateInSingleFeed(state.mainFeed);
        if (
          updatedPost.userId &&
          state.userPosts &&
          state.userPosts[updatedPost.userId]
        ) {
          updateInSingleFeed(state.userPosts[updatedPost.userId]);
        }
        updateInSingleFeed(state.followingFeed);
        updateInSingleFeed(state.popularPosts);
        updateInSingleFeed(state.savedPostsFeed);
        updateInSingleFeed(state.searchedPosts);
      }
    },
  },
  extraReducers: (builder) => {
    const genericPaginatedFetchHandler = (feedStateKey) => ({
      pending: (state, action) => {
        const page = action.meta.arg?.page || 1;
        let targetFeed;

        if (feedStateKey === "userPosts") {
          const userId = action.meta.arg.userId;
          if (!state.userPosts[userId])
            state.userPosts[userId] = {
              ...initialPaginatedFeedState,
              feedType: `userPosts-${userId}`,
              limit: initialState.userPosts.commonLimit,
            };
          targetFeed = state.userPosts[userId];
        } else if (feedStateKey === "searchedPosts") {
          targetFeed = state.searchedPosts;
        } else {
          targetFeed = state[feedStateKey];
        }

        if (targetFeed) {
          targetFeed.status =
            page === 1 || targetFeed.currentPage === 0
              ? "loading"
              : "loadingMore";
          if (page === 1 || targetFeed.currentPage === 0)
            targetFeed.error = null; // Скидаємо помилку тільки при першому завантаженні
        }
      },
      fulfilled: (state, action) => {
        const { posts, currentPage, totalPages, totalItems } = action.payload;
        let targetFeed;
        let feedTypeForLog;

        if (feedStateKey === "userPosts") {
          const userId = action.meta.arg.userId;
          targetFeed = state.userPosts[userId]; // Має існувати після pending
          feedTypeForLog = `userPosts-${userId}`;
        } else if (feedStateKey === "searchedPosts") {
          targetFeed = state.searchedPosts;
          targetFeed.query = action.meta.arg.query; // Зберігаємо поточний запит
          feedTypeForLog = `searchedPosts (query: ${targetFeed.query})`;
        } else {
          targetFeed = state[feedStateKey];
          feedTypeForLog = targetFeed.feedType;
        }

        if (targetFeed) {
          // Припускаємо, що бекенд повертає поля, сумісні з FullPostData
          const mappedPosts = (posts || []).map((post) => ({ ...post }));

          if (currentPage === 1 || targetFeed.currentPage === 0) {
            targetFeed.items = mappedPosts;
          } else if (currentPage > targetFeed.currentPage) {
            const existingIds = new Set(targetFeed.items.map((p) => p.postId));
            const newUniquePosts = mappedPosts.filter(
              (pNew) => !existingIds.has(pNew.postId)
            );
            targetFeed.items.push(...newUniquePosts);
          }

          targetFeed.currentPage = currentPage;
          targetFeed.totalPages = totalPages;
          targetFeed.totalItems = totalItems;
          targetFeed.hasMore = currentPage < totalPages;
          targetFeed.status = "succeeded";
          targetFeed.error = null;
        }
      },
      rejected: (state, action) => {
        let targetFeed = state[feedStateKey];
        if (feedStateKey === "userPosts") {
          const userId = action.meta.arg.userId;
          targetFeed = state.userPosts[userId]; // Має існувати
        } else if (feedStateKey === "searchedPosts") {
          targetFeed = state.searchedPosts;
        }
        if (targetFeed) {
          targetFeed.status = "failed";
          targetFeed.error =
            action.payload?.error || "Unknown error fetching data";
        }
      },
    });

    builder
      .addCase(
        fetchPosts.pending,
        genericPaginatedFetchHandler("mainFeed").pending
      )
      .addCase(
        fetchPosts.fulfilled,
        genericPaginatedFetchHandler("mainFeed").fulfilled
      )
      .addCase(
        fetchPosts.rejected,
        genericPaginatedFetchHandler("mainFeed").rejected
      )

      .addCase(
        fetchUserPosts.pending,
        genericPaginatedFetchHandler("userPosts").pending
      )
      .addCase(
        fetchUserPosts.fulfilled,
        genericPaginatedFetchHandler("userPosts").fulfilled
      )
      .addCase(
        fetchUserPosts.rejected,
        genericPaginatedFetchHandler("userPosts").rejected
      )

      .addCase(
        fetchFollowingPosts.pending,
        genericPaginatedFetchHandler("followingFeed").pending
      )
      .addCase(
        fetchFollowingPosts.fulfilled,
        genericPaginatedFetchHandler("followingFeed").fulfilled
      )
      .addCase(
        fetchFollowingPosts.rejected,
        genericPaginatedFetchHandler("followingFeed").rejected
      )

      .addCase(
        fetchPopularPosts.pending,
        genericPaginatedFetchHandler("popularPosts").pending
      )
      .addCase(
        fetchPopularPosts.fulfilled,
        genericPaginatedFetchHandler("popularPosts").fulfilled
      )
      .addCase(
        fetchPopularPosts.rejected,
        genericPaginatedFetchHandler("popularPosts").rejected
      )

      .addCase(
        fetchSavedPosts.pending,
        genericPaginatedFetchHandler("savedPostsFeed").pending
      )
      .addCase(
        fetchSavedPosts.fulfilled,
        genericPaginatedFetchHandler("savedPostsFeed").fulfilled
      )
      .addCase(
        fetchSavedPosts.rejected,
        genericPaginatedFetchHandler("savedPostsFeed").rejected
      )

      .addCase(
        searchPosts.pending,
        genericPaginatedFetchHandler("searchedPosts").pending
      )
      .addCase(
        searchPosts.fulfilled,
        genericPaginatedFetchHandler("searchedPosts").fulfilled
      )
      .addCase(
        searchPosts.rejected,
        genericPaginatedFetchHandler("searchedPosts").rejected
      )

      .addCase(addPost.pending, (state) => {
        state.addPostStatus = "loading";
        state.addPostError = null;
      })
      .addCase(addPost.fulfilled, (state, action) => {
        state.addPostStatus = "succeeded";
        const newPost = action.payload; // Очікуємо повний об'єкт поста
        if (newPost && newPost.postId !== undefined) {
          // Додаємо на початок mainFeed
          if (state.mainFeed && state.mainFeed.items) {
            state.mainFeed.items.unshift(newPost);
            state.mainFeed.totalItems = (state.mainFeed.totalItems || 0) + 1;
            state.mainFeed.totalPages = Math.ceil(
              state.mainFeed.totalItems / state.mainFeed.limit
            );
          }
          // Додаємо на початок userPosts, якщо це стрічка автора
          if (
            newPost.userId &&
            state.userPosts &&
            state.userPosts[newPost.userId]?.items
          ) {
            state.userPosts[newPost.userId].items.unshift(newPost);
            state.userPosts[newPost.userId].totalItems =
              (state.userPosts[newPost.userId].totalItems || 0) + 1;
            state.userPosts[newPost.userId].totalPages = Math.ceil(
              state.userPosts[newPost.userId].totalItems /
                state.userPosts[newPost.userId].limit
            );
          }
          // Можна також оновити followingFeed, якщо автор є серед відстежуваних, але це складніше без дод. інформації
        }
      })
      .addCase(addPost.rejected, (state, action) => {
        state.addPostStatus = "failed";
        state.addPostError = action.payload;
      })

      .addCase(deletePostById.pending, (state, action) => {
        state.deletePostStatus = "loading";
        state.deletePostError = {
          postId: action.meta.arg.postId,
          message: null,
        };
      })
      .addCase(deletePostById.fulfilled, (state, action) => {
        state.deletePostStatus = "succeeded";
        const { postId, userId: authorIdOfDeletedPost } = action.payload;

        const processFeed = (feed) => {
          if (feed && feed.items && Array.isArray(feed.items)) {
            const initialLength = feed.items.length;
            feed.items = feed.items.filter((post) => post.postId !== postId);
            if (feed.items.length < initialLength) {
              // Якщо пост дійсно був видалений зі списку
              feed.totalItems = Math.max(0, (feed.totalItems || 0) - 1);
              feed.totalPages = Math.ceil(feed.totalItems / feed.limit);
              if (feed.currentPage > feed.totalPages && feed.totalPages > 0)
                feed.currentPage = feed.totalPages;
              if (feed.totalItems === 0) feed.currentPage = 0; // Скидаємо на 0, якщо елементів не залишилось
            }
          }
        };
        processFeed(state.mainFeed);
        if (
          authorIdOfDeletedPost &&
          state.userPosts &&
          state.userPosts[authorIdOfDeletedPost]
        ) {
          processFeed(state.userPosts[authorIdOfDeletedPost]);
        }
        processFeed(state.followingFeed);
        processFeed(state.popularPosts);
        processFeed(state.savedPostsFeed);
        processFeed(state.searchedPosts);
        state.deletePostError = null;
      })
      .addCase(deletePostById.rejected, (state, action) => {
        state.deletePostStatus = "failed";
        state.deletePostError = action.payload;
      })

      .addCase(updatePostById.pending, (state, action) => {
        state.updatePostStatus = "loading";
        state.updatePostError = {
          postId: action.meta.arg.postId,
          message: null,
        };
      })
      .addCase(updatePostById.fulfilled, (state, action) => {
        state.updatePostStatus = "succeeded";
        const updatedPost = action.payload;
        if (updatedPost && updatedPost.postId !== undefined) {
          // Використовуємо вже існуючий редьюсер updatePostInFeeds
          postsSlice.caseReducers.updatePostInFeeds(state, {
            payload: updatedPost,
          });
        }
        state.updatePostError = null;
      })
      .addCase(updatePostById.rejected, (state, action) => {
        state.updatePostStatus = "failed";
        state.updatePostError = action.payload;
      })

      // Обробники для like/unlike/save/unsave
      .addMatcher(
        (action) =>
          [
            likePost.fulfilled.type,
            unlikePost.fulfilled.type,
            savePost.fulfilled.type,
            unsavePost.fulfilled.type,
          ].includes(action.type),
        (state, action) => {
          const updatedPostFromServer = action.payload; // Це вже оновлений пост з бекенду
          if (
            updatedPostFromServer &&
            updatedPostFromServer.postId !== undefined
          ) {
            // Використовуємо вже існуючий редьюсер updatePostInFeeds
            postsSlice.caseReducers.updatePostInFeeds(state, {
              payload: updatedPostFromServer,
            });
          }
          if (action.type.includes("like")) {
            state.likeStatus = "succeeded";
            state.likeError = null;
          }
          if (action.type.includes("save")) {
            state.saveActionStatus = "succeeded";
            state.saveActionError = null;
          }
        }
      )
      .addMatcher(
        (action) =>
          [likePost.pending.type, unlikePost.pending.type].includes(
            action.type
          ),
        (state, action) => {
          state.likeStatus = "loading";
          state.likeError = { postId: action.meta.arg, message: null };
        }
      )
      .addMatcher(
        (action) =>
          [likePost.rejected.type, unlikePost.rejected.type].includes(
            action.type
          ),
        (state, action) => {
          state.likeStatus = "failed";
          state.likeError = action.payload;
        }
      )
      .addMatcher(
        (action) =>
          [savePost.pending.type, unsavePost.pending.type].includes(
            action.type
          ),
        (state, action) => {
          state.saveActionStatus = "loading";
          state.saveActionError = { postId: action.meta.arg, message: null };
        }
      )
      .addMatcher(
        (action) =>
          [savePost.rejected.type, unsavePost.rejected.type].includes(
            action.type
          ),
        (state, action) => {
          state.saveActionStatus = "failed";
          state.saveActionError = action.payload;
        }
      );
  },
});

export const {
  resetPostsFeed,
  clearAllPostsData,
  resetLikeStatus,
  resetSaveActionStatus,
  resetAddPostStatus,
  resetDeletePostStatus,
  resetUpdatePostStatus,
  updatePostInFeeds, // Експортуємо updatePostInFeeds
} = postsSlice.actions;

export default postsSlice.reducer;
