import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPosts } from "../../../redux/postsSlice";
import MainPage from "./Main_page";

function MainPageContainer() {
  const dispatch = useDispatch();
  const { posts, status, error } = useSelector((state) => state.posts);

  useEffect(() => {
    dispatch(fetchPosts()); // Отримати всі пости
  }, [dispatch]);

  return <MainPage posts={posts} status={status} error={error} addPost={() => {}} />;
}

export default MainPageContainer;
