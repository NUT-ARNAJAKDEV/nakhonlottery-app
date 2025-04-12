import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from './firebaseConfig';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, writeBatch, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import styles from './Page.module.css';
import { FaBars, FaCheck, FaX } from 'react-icons/fa6';
import Date from './components/Date/Date';
import _Random from './components/Random/_Random';
import Cookies from 'js-cookie';
import __Order from './components/Order/__Order';
import More from './components/More/More'
import { FaFacebook, FaLine, FaRegUser } from 'react-icons/fa6';

function Page_Users() {
  const [count, setCount] = useState(0);
  const [activeMenu, setActiveMenu] = useState("หน้าแรก");
  const [showLogoutForm, setShowLogoutForm] = useState(false);
  const [showMemberInfo, setShowMemberInfo] = useState(false);
  const [memberData, setMemberData] = useState({ firstLoginTime: null });
  const [isToggled, setToggle] = useState(false);
  const [showCookieConsent, setShowCookieConsent] = useState(false);
  const [cookieConsentGiven, setCookieConsentGiven] = useState(null);
  const [inactivityTimer, setInactivityTimer] = useState(null);
  const navigate = useNavigate();
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isImageVisible, setImageVisible] = useState(false);
  const [isImageVisible2, setImageVisible2] = useState(false);
  const [isImageVisible3, setImageVisible3] = useState(false);
  const [uniqueUsers, setUniqueUsers] = useState(0); // เพิ่ม state สำหรับนับผู้ใช้งาน

  const toggleImage = () => {
    setImageVisible(!isImageVisible);
  };

  const toggleImage2 = () => {
    setImageVisible2(!isImageVisible2);
  };

  const toggleImage3 = () => {
    setImageVisible3(!isImageVisible3);
  };

  // ฟังก์ชันสำหรับนับจำนวนผู้ใช้งานแบบ Real-time
  useEffect(() => {
    const q = query(
      collection(db, 'auth'),
      where('event', '==', 'Login')
    );

    const unsubscribeUsers = onSnapshot(q, (querySnapshot) => {
      const emails = new Set();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.email) {
          emails.add(data.email);
        }
      });

      setUniqueUsers(emails.size);
    });

    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // บันทึกการ Login ใน collection 'auth'
        await logAuthActivity('Login', 'auth');

        const metadata = user.metadata;
        setMemberData({ firstLoginTime: metadata.creationTime });

        // ลบสินค้าในรถเข็นเมื่อล็อกอิน
        try {
          const itemsDeleted = await clearUserCart(user.email);
          if (itemsDeleted > 0) {
            console.log(`ลบ ${itemsDeleted} รายการออกจากรถเข็นเมื่อล็อกอิน`);
          }
        } catch (error) {
          console.error("Error clearing cart on login: ", error);
        }

        // Always show cookie consent on login (unless already given)
        const consent = Cookies.get('cookieConsent');
        if (consent === undefined) {
          setShowCookieConsent(true);
          const timer = setTimeout(() => {
            if (cookieConsentGiven === null) {
              handleLogout();
            }
          }, 30 * 60 * 1000);
          setInactivityTimer(timer);
        } else {
          setCookieConsentGiven(consent === 'true');
          startInactivityTimer(consent === 'true' ? 90 : 60);
        }
      } else {
        navigate('/login');
      }
    });

    // Activity listeners
    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      unsubscribe();
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, []);

  const handleUserActivity = () => {
    if (cookieConsentGiven !== null) {
      startInactivityTimer(cookieConsentGiven ? 90 : 60);
    }
  };

  const startInactivityTimer = (minutes) => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    const timer = setTimeout(() => {
      handleLogout();
    }, minutes * 60 * 1000);
    setInactivityTimer(timer);
  };

  const handleCookieResponse = (accepted) => {
    setCookieConsentGiven(accepted);
    setShowCookieConsent(false);
    Cookies.set('cookieConsent', accepted, { expires: 365 });
    startInactivityTimer(accepted ? 90 : 60);
  };

  const logAuthEvent = async (eventType) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const email = user.email;

      // ✅ เพิ่ม email admin หลายคนได้ง่ายขึ้น
      const adminEmails = [
        'nuttawutsensith168283@gmail.com',
        'Kamonmingmongkon@gmail.com'
      ];

      const isAdmin = adminEmails.includes(email);
      const right = isAdmin ? 'Admin' : 'User';

      const now = new Date();
      const day = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0];

      await addDoc(collection(db, 'log'), {
        id: eventType,
        email: email,
        right: right,
        day: day,
        time: time,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error logging auth event: ", error);
    }
  };

  const clearUserCart = async (userEmail) => {
    try {
      const cartsRef = collection(db, 'carts');
      const q = query(cartsRef, where('userEmail', '==', userEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        return querySnapshot.size;
      }
      return 0;
    } catch (error) {
      console.error("Error clearing cart: ", error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const confirmLogout = window.confirm(
        "คุณแน่ใจหรือไม่ที่จะออกจากระบบ?\n\nสินค้าในรถเข็นทั้งหมดจะถูกลบอัตโนมัติ"
      );
      if (!confirmLogout) return;

      // บันทึกการ Logout ใน collection 'out'
      await logAuthActivity('Logout', 'out');

      const itemsDeleted = await clearUserCart(user.email);

      await signOut(auth);
      Cookies.remove('cookieConsent');
      alert(`ออกจากระบบสำเร็จ${itemsDeleted > 0 ? ' สินค้าในรถเข็นถูกลบแล้ว' : ''}`);
      navigate("/");
    } catch (error) {
      console.error("Error signing out: ", error);
      alert("เกิดข้อผิดพลาดขณะออกจากระบบ: " + error.message);
    }
  };

  const handleToggle = () => {
    setToggle(!isToggled);
  };

  const logAuthActivity = async (eventType) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await addDoc(collection(db, 'auth'), {
        email: user.email,
        event: eventType, // 'Login' หรือ 'Logout'
        timestamp: serverTimestamp()
      });
      console.log(`Logged ${eventType} event for ${user.email}`);
    } catch (error) {
      console.error("Error logging auth activity: ", error);
    }
  };

  const formatThaiDate = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const thaiYear = date.getFullYear() + 543;
    const monthNames = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
      "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
      "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = thaiYear;
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
  };

  const handleMemberInfoClick = () => {
    setActiveMenu("ข้อมูลสมาชิก");
    setShowMemberInfo(true);
  };

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
      <nav>
        <div className={styles.container}>
          <div className={styles.nav_con}>
            <div className={styles.nav_logo}>
              <a href="#">นครลอตเตอรี่</a>
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
                <a
                  className={activeMenu === "คู่มือท่องเว็บ" ? styles.active : ""}
                  onClick={toggleImage3}
                >
                  คู่มือท่องเว็บ
                </a>
              </li>
              <li>
                <a
                  className={activeMenu === "เกี่ยวกับเรา" ? styles.active : ""}
                  onClick={toggleImage2}
                >
                  เกี่ยวกับเรา
                </a>
              </li>
              <li>
                <a
                  className={styles.profile}
                  onClick={handleMemberInfoClick}
                >
                  ข้อมูลสมาชิก
                </a>
              </li>
            </ul>

            <div
              className={styles.nav_login}
              onClick={() => setShowLogoutForm(true)}
            >
              <p>ออกจากระบบ</p>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className={styles.mobile_header}>
            <a href="#" className={styles.mobile_title}>นครลอตเตอรี่</a>
            <FaBars className={styles.bars} onClick={handleToggle} />
          </div>

          {isToggled && (
            <>
              <ul className={styles.mobile_menu}>
                <li><a onClick={scrollToTop}>หน้าแรก</a></li>
                <li><a onClick={toggleImage3}>คู่มือท่องเว็บ</a></li>
                <li><a onClick={toggleImage2}>เกี่ยวกับเรา</a></li>
                <li><a className={styles.profile} onClick={handleMemberInfoClick}>ข้อมูลสมาชิก</a></li>
              </ul>
              <div
                className={styles.mobile_button}
                onClick={() => setShowLogoutForm(true)}
              >
                <p>ออกจากระบบ</p>
              </div>
            </>
          )}
        </div>

        {/* Logout Confirmation Modal */}
        {showLogoutForm && (
          <div className={styles.logout_form_overlay}>
            <div className={styles.logout_form}>
              <p>ต้องการออกจากระบบใช่หรือไม่?</p>
              <div className={styles.logout_buttons}>
                <button onClick={handleLogout}>ใช่</button>
                <button onClick={() => setShowLogoutForm(false)}>ไม่ใช่</button>
              </div>
            </div>
          </div>
        )}

        {/* Member Info Modal */}
        {showMemberInfo && (
          <div className={styles.member_info_overlay}>
            <div className={styles.member_info_form}>
              <h3>ข้อมูลบัญชีสมาชิก</h3>
              <div className={styles.member_info_content}>
                <div className={styles.member_info_row}>
                  <span className={styles.member_info_label}>อีเมลสมาชิก :</span>
                  <span className={styles.member_info_value}>{auth.currentUser?.email || "ไม่พบข้อมูล"}</span>
                </div>
                <div className={styles.member_info_row}>
                  <span className={styles.member_info_label}>สถานะสมาชิก :</span>
                  <span className={styles.member_info_value}>USER</span>
                </div>
              </div>
              <button
                className={styles.close_button}
                onClick={() => setShowMemberInfo(false)}
              >
                ปิด
              </button>
            </div>
          </div>
        )}
      </nav>

      {showCookieConsent && (
        <div className={styles.cookie_consent_overlay}>
          <div className={styles.cookie_consent_form}>
            <h3>นโยบายการใช้คุกกี้</h3>
            <div className={styles.cookie_consent_content}>
              <p>เราใช้คุกกี้เพื่อปรับปรุงประสบการณ์การใช้งานของคุณและมีความจำเป็นต่อการทำงานของเว็บไซต์ เช่น การเข้าสู่ระบบและการรักษาความปลอดภัย หากไม่มีคุกกี้เหล่านี้ เว็บไซต์อาจไม่สามารถทำงานได้อย่างถูกต้อง</p>
            </div>
            <div className={styles.cookie_consent_buttons}>
              <button
                className={styles.accept_button}
                onClick={() => handleCookieResponse(true)}
              >
                <FaCheck /> ยอมรับ
              </button>
              <button
                className={styles.decline_button}
                onClick={() => handleCookieResponse(false)}
              >
                <FaX /> ไม่ยอมรับ
              </button>
            </div>
          </div>
        </div>
      )}

      <Date />
      <_Random />
      <__Order />
      <More />
      <div className={styles.contact_wrapper}>
        <div className={styles.contact_con}>
          <div className={styles.contact_logo}>
            <div className={styles.watch}>
              <div className={styles.watch_detail}>
                <FaRegUser />
                <p>สมาชิกปัจจุบัน</p>
              </div>
              <div className={styles.watch_num}>
                <p>{uniqueUsers}</p>
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
              <li><a onClick={toggleImage3}>คู่มือท่องเว็บ</a></li>
              <li>|</li>
              <li><a onClick={toggleImage2}>เกี่ยวกับเรา</a></li>
              <li>|</li>
              <li><a className={styles.profile} onClick={handleMemberInfoClick}>ข้อมูลสมาชิก</a></li>
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
            <img src="/line-qr.png" alt="line-qr" className={styles.image_display} />
          </div>
        )}

        {isImageVisible2 && (
          <div className={styles.image_overlay2} onClick={toggleImage2}>
            <img src="/cer.png" alt="cer" />
          </div>
        )}

        {isImageVisible3 && (
          <div className={styles.image_overlay3} onClick={toggleImage3}>
            <img src="/manual.png" alt="manual" />
          </div>
        )}
      </div>
      {showScrollButton && (
        <button
          onClick={scrollToTop}
          className={styles.scrollToTopButton}
        >
          ↑
        </button>
      )}
    </>
  );
}

export default Page_Users;