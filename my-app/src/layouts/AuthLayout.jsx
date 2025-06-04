import React from 'react';
import { Outlet } from 'react-router-dom';
import s from "./AuthLayout.module.css";

export default function AuthLayout() {
  return (
    <div className={s.auth_layout}>
      <div className={s.auth_background}></div>
      <div className={s.auth_content}>
        <Outlet />
      </div>
    </div>
  );
}