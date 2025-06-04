// my-app/src/layouts/MainLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header/Header';
import NavBar from '../components/NavBar/NavBar';
import RightSidebar from '../components/RightSidebar/RightSidebar'; // <-- Додано імпорт
import s from './MainLayout.module.css';
import RightSideBarController from '../components/RightSidebar/RightSideBarController';

const MainLayout = () => {
  console.log("MainLayout rendering");
  return (
    <div className={s.appWrapper}>
      <Header />
      <div className={s.body}>
        <NavBar />
        <main className={s.mainContent}>
          <Outlet />
        </main>
        <RightSideBarController /> {/* <-- Замінено placeholder на компонент */}
      </div>
    </div>
  );
};

export default MainLayout;