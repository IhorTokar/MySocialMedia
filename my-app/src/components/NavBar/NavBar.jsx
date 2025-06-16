// my-app/src/components/NavBar/NavBar.jsx
import React from "react";
import styles from "./NavBar.module.css"; // <--- ВИПРАВЛЕНО: classes на styles
import { NavLink, useNavigate } from "react-router-dom";

// Іконки (переконайтесь, що шляхи правильні)
import homeIcon from '../../assets/icons/Home.png'; 
import profileIcon from '../../assets/icons/Profile.png';
import messagesIcon from '../../assets/icons/Messages.png';
import savedIcon from '../../assets/icons/Saved.png';
import moreIcon from '../../assets/icons/More.png';
import plusIcon from '../../assets/icons/Plus.png';
import usersIcon from '../../assets/icons/Users.png';

function NavBar() {
  const navigate = useNavigate();

  const navItems = [
    { path: "/", label: "Головна", icon: homeIcon },
    { path: "/profile", label: "Профіль", icon: profileIcon },
    { path: "/dialogs", label: "Повідомлення", icon: messagesIcon },
    { path: "/users", label: "Користувачі", icon: usersIcon },
    { path: "/saved", label: "Збережені", icon: savedIcon },
    { path: "/settings_page", label: "Налаштування", icon: moreIcon },
  ];

  const handlePostButtonClick = () => {
    console.log("Кнопка 'Допис' натиснута, перенаправлення на профіль");
    navigate('/profile'); // <--- ВИПРАВЛЕНО: Перенаправлення на '/profile'
  };

  return (
    <nav className={styles.nav}> {/* <--- ВИПРАВЛЕНО */}


      <div className={styles.navItemsContainer}> {/* <--- ВИПРАВЛЕНО */}
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.activeNavLink : ""}` // <--- ВИПРАВЛЕНО
            }
          >
            <img src={item.icon} alt={item.label} className={styles.navIcon} /> {/* <--- ВИПРАВЛЕНО */}
            <span className={styles.navLabel}>{item.label}</span> {/* <--- ВИПРАВЛЕНО */}
          </NavLink>
        ))}
      </div>

      <button className={styles.postButton} onClick={handlePostButtonClick}> {/* <--- ВИПРАВЛЕНО */}
        <img src={plusIcon} alt="Допис" className={styles.postButtonIcon} /> {/* <--- ВИПРАВЛЕНО */}
        <span className={styles.postButtonText}>Допис</span> {/* <--- Залишено styles, оскільки ви це відзначили */}
      </button>

      <div className={styles.communitiesSection}> {/* <--- ВИПРАВЛЕНО */}
        <h3 className={styles.communitiesTitle}>Спільноти</h3> {/* <--- ВИПРАВЛЕНО */}
      </div>
    </nav>
  );
}

export default NavBar;