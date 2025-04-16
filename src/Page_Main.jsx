import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import Date from './components/Date/Date';
import Random from './components/Random/Random';
import Order from './components/Order/Order';
import More from './components/More/More';
import styles from './Page.module.css';
import { FaBars } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from './firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { FaFacebook, FaLine, FaRegUser, FaAnglesUp } from 'react-icons/fa6';

function Page_Main() {
  const [count, setCount] = useState(0);
  const [authCount, setAuthCount] = useState(0); // เปลี่ยนจาก uniqueUsers เป็น authCount

  // โค้ดจาก Navbar component
  const [activeMenu, setActiveMenu] = useState("หน้าแรก");
  const navigate = useNavigate();
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isImageVisible, setImageVisible] = useState(false);

  const toggleImage = () => {
    setImageVisible(!isImageVisible);
  };

  // ฟังก์ชันสำหรับนับจำนวนผู้ใช้งานแบบ Real-time จาก collection 'auth'
  useEffect(() => {
    const authUnsub = onSnapshot(collection(db, 'auth'), (snapshot) => {
      const uniqueEmails = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.email) {
          uniqueEmails.add(data.email);
        }
      });
      setAuthCount(uniqueEmails.size);
    });

    return () => authUnsub();
  }, []);

  const handleGoogleSignIn = async (e) => {
    e.preventDefault();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (user.email === 'nuttawutsensith168283@gmail.com' || user.email === 'kamonmingmongkon@gmail.com') {
        console.log("User signed in with correct email:", user);
        navigate('/admin');
      } else {
        console.log("User signed in with incorrect email:", user);
        navigate('/users');
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const [isToggled, setToggle] = useState(false);

  function handleToggle() {
    setToggle(!isToggled);
  }

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {/* เนื้อหา Navbar ที่แทนที่ <Navbar /> */}
      <nav>
        <div className={styles.container}>
          <div className={styles.nav_con}>
            <div className={styles.nav_logo}>
              <a onClick={scrollToTop}>นครลอตเตอรี่</a>
            </div>

            <ul className={styles.the_nav}>
              <li>
                <a
                  className={activeMenu === "หน้าแรก" ? styles.active : ""}
                  onClick={scrollToTop}
                >
                  หน้าแรก
                </a>
              </li>
              <li>
                <a href="#"
                  className={activeMenu === "คู่มือท่องเว็บ" ? styles.active : ""}
                  onClick={handleGoogleSignIn}
                >
                  คู่มือท่องเว็บ
                </a>
              </li>
              <li>
                <a href="#"
                  className={activeMenu === "เกี่ยวกับเรา" ? styles.active : ""}
                  onClick={handleGoogleSignIn}
                >
                  เกี่ยวกับเรา
                </a>
              </li>
              <li>
                <a href="#"
                  className={activeMenu === "ข้อมูลสมาชิก" ? styles.active : ""}
                  onClick={handleGoogleSignIn}
                >
                  ข้อมูลสมาชิก
                </a>
              </li>
            </ul>

            <div className={styles.nav_login} onClick={handleGoogleSignIn}>
              <p>เข้าสู่ระบบ</p>
            </div>
          </div>
          {/* Mobile Menu */}
          <div className={styles.mobile_header}>
            <a onClick={scrollToTop} className={styles.mobile_title}>นครลอตเตอรี่</a>
            <FaBars className={styles.bars} onClick={handleToggle} />
          </div>
          {isToggled ? (
            <>
              <ul className={styles.mobile_menu}>
                <li onClick={scrollToTop}><a>หน้าแรก</a></li>
                <li onClick={handleGoogleSignIn}><a>คู่มือท่องเว็บ</a></li>
                <li onClick={handleGoogleSignIn}><a>เกี่ยวกับเรา</a></li>
                <li onClick={handleGoogleSignIn}><a>ข้อมูลสมาชิก</a></li>
              </ul>
              <div className={styles.mobile_button} onClick={handleGoogleSignIn}>
                <p>เข้าสู่ระบบ</p>
              </div>
            </>
          ) : null}
        </div>
      </nav>
      <Date />
      <Random />
      <Order />
      <More />
      <div className={styles.contact_wrapper}>
        <div className={styles.contact_con}>
          <div className={styles.contact_logo}>
            <div className={styles.watch}>
              <div className={styles.watch_detail}>
                < FaRegUser />
                <p>สมาชิกปัจจุบัน</p>
              </div>
              <div className={styles.watch_num}>
                <p>{authCount}</p> {/* เปลี่ยนจาก uniqueUsers เป็น authCount */}
              </div>
            </div>
            <div className={styles.regist}>
              <img src="https://ketshopweb.com/upload-img/1632477296144.webp" alt="" />
            </div>
          </div>
          <div className={styles.contact_list}>
            <ul className={styles.contact_nav}>
              <li><a onClick={scrollToTop}>หน้าแรก</a></li>
              <li>|</li>
              <li><a href='#' onClick={handleGoogleSignIn} >คู่มือท่องเว็บ</a></li>
              <li>|</li>
              <li><a href="#" onClick={handleGoogleSignIn}>เกี่ยวกับเรา</a></li>
              <li>|</li>
              <li><a href="#" onClick={handleGoogleSignIn}>ข้อมูลสมาชิก</a></li>
              <li>|</li>
              <li><p>ติดต่อเรา Contact Us :</p></li>
            </ul>
            <ul className={styles.contact_social}>
              <li><a href="https://www.facebook.com/nudtavud.senapun/" target="_blank" className={styles.facebook}><FaFacebook /></a></li>
              <li>
                <div className={styles.line} onClick={toggleImage}>
                  <FaLine />
                </div>
              </li>
            </ul>
          </div>
        </div>

        {isImageVisible && (
          <div className={styles.image_overlay} onClick={toggleImage}>
            <img src="/line-qr.png" alt="แสดงผล" className={styles.image_display} />
          </div>
        )}
      </div>
      {showScrollButton && (
        <button
          onClick={scrollToTop}
          className={styles.scrollToTopButton}
        >
          <FaAnglesUp />
        </button>
      )}
    </>
  );
}

export default Page_Main;