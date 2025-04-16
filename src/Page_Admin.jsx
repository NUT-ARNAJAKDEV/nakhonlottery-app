import React, { useState, useEffect } from 'react';
import { auth } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import Date from './components/Date/Date';
import _Random from './components/Random/_Random';
import _Order from './components/Order/_Order';
import Statics from './components/Statics/Statics';
import More from './components/More/More'
import { useNavigate } from 'react-router-dom';
import styles from './Page.module.css';
import { FaBars } from 'react-icons/fa6';
import { db } from "./firebaseConfig";
import { signOut } from 'firebase/auth';
import {
    collection,
    addDoc,
    serverTimestamp,
    writeBatch,
    query,
    where,
    getDocs,
    onSnapshot
} from "firebase/firestore";
import { FaFacebook, FaLine, FaRegUser, FaAnglesUp } from 'react-icons/fa6';

function Page_Admin() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeMenu, setActiveMenu] = useState("หน้าแรก");
    const [showLogoutForm, setShowLogoutForm] = useState(false);
    const [showMemberInfo, setShowMemberInfo] = useState(false);
    const [memberData, setMemberData] = useState({ firstLoginTime: null });
    const [isToggled, setToggle] = useState(false);
    const [inactivityTimer, setInactivityTimer] = useState(null);
    const navigate = useNavigate();
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isImageVisible, setImageVisible] = useState(false);
    const [isImageVisible2, setImageVisible2] = useState(false);
    const [isImageVisible3, setImageVisible3] = useState(false);
    const [authCount, setAuthCount] = useState(0); // เปลี่ยนจาก uniqueUsers เป็น authCount

    const toggleImage = () => {
        setImageVisible(!isImageVisible);
    };

    const toggleImage2 = () => {
        setImageVisible2(!isImageVisible2);
    };

    const toggleImage3 = () => {
        setImageVisible3(!isImageVisible3);
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

    // ตรวจสอบสถานะการเข้าสู่ระบบ
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    setUser(user);
                    await logAuthActivity('Login', 'auth');
                    const itemsDeleted = await clearUserCart(user.email);
                    if (itemsDeleted > 0) {
                        console.log(`ลบ ${itemsDeleted} รายการออกจากรถเข็นเมื่อล็อกอิน`);
                    }
                } else {
                    navigate('/login');
                }
                setLoading(false);
            } catch (error) {
                console.error("Authentication error:", error);
                if (error.code === 'NOT_FOUND') {
                    await signOut(auth);
                    navigate("/");
                }
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const logAuthEvent = async (eventType) => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const email = user.email;
            const adminEmails = [
                'nuttawutsensith168283@gmail.com',
                'kamonmingmongkon@gmail.com'
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

    const handleLogout = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            await logAuthActivity('Logout', 'out');
            const itemsDeleted = await clearUserCart(user.email);
            await signOut(auth);
            navigate("/");
        } catch (error) {
            console.error("Error during logout: ", error);
            if (error.code === 'NOT_FOUND') {
                await signOut(auth);
                navigate("/");
            } else {
                alert("เกิดข้อผิดพลาดขณะออกจากระบบ: " + error.message);
            }
        }
    };

    const handleToggle = () => {
        setToggle(!isToggled);
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

    if (loading) {
        return <div>กำลังตรวจสอบการเข้าสู่ระบบ...</div>;
    }

    return (
        <>
            <nav>
                <div className={styles.container}>
                    <div className={styles.nav_con}>
                        <div className={styles.nav_logo}>
                            <a onClick={scrollToTop}>นครลอตเตอรี่</a>
                        </div>

                        <ul className={styles.the_option}>
                            <li>
                                <a  onClick={scrollToTop}
                                    className={activeMenu === "หน้าแรก" ? styles.active : ""}
                                >
                                    หน้าแรก
                                </a>
                            </li>
                            <li>
                                <a  onClick={toggleImage3}
                                    className={activeMenu === "คู่มือท่องเว็บ" ? styles.active : ""}
                                >
                                    คู่มือท่องเว็บ
                                </a>
                            </li>
                            <li>
                                <a  onClick={toggleImage2}
                                    className={activeMenu === "เกี่ยวกับเรา" ? styles.active : ""}
                                >
                                    เกี่ยวกับเรา
                                </a>
                            </li>
                            <li>
                                <a  onClick={handleMemberInfoClick}
                                    className={activeMenu === "ข้อมูลสมาชิก" ? styles.active : ""}
                                >
                                    ข้อมูลสมาชิก
                                </a>
                            </li>
                        </ul>

                        <div className={styles.nav_login} onClick={() => setShowLogoutForm(true)}>
                            <p>ออกจากระบบ</p>
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
                                <li><a onClick={scrollToTop}>หน้าแรก</a></li>
                                <li><a onClick={toggleImage3}>คู่มือท่องเว็บ</a></li>
                                <li><a onClick={toggleImage2}>เกี่ยวกับเรา</a></li>
                                <li><a onClick={handleMemberInfoClick}>ข้อมูลสมาชิก</a></li>
                            </ul>
                            <div className={styles.mobile_button} onClick={() => setShowLogoutForm(true)}>
                                <p>ออกจากระบบ</p>
                            </div>
                        </>
                    ) : null}
                </div>
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
                {showMemberInfo && (
                    <div className={styles.member_info_overlay}>
                        <div className={styles.member_info_form}>
                            <h3>ข้อมูลบัญชีสมาชิก</h3>
                            <div className={styles.member_info_content}>
                                <div className={styles.member_info_row}>
                                    <span className={styles.member_info_label}>อีเมล :</span>
                                    <span className={styles.member_info_value}>{auth.currentUser?.email || "ไม่พบข้อมูล"}</span>
                                </div>
                                <div className={styles.member_info_row}>
                                    <span className={styles.member_info_label}>สถานะสมาชิก :</span>
                                    <span className={styles.member_info_value}>ADMIN</span>
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
                {isImageVisible3 && (
                    <div className={styles.imageOverlay}>
                        <div>
                            <button className={styles.closeButton} onClick={() => setImageVisible3(false)}>×</button>

                            <img src="/manual.png" alt="คู่มือเว็บไซต์" className={styles.imagePopup} />
                        </div>
                    </div>
                )}

                {isImageVisible2 && (
                    <div className={styles.imageOverlay}>
                        <div>
                            <button className={styles.closeButton} onClick={() => setImageVisible2(false)}>×</button>
                            <h2>เกี่ยวกับเรา</h2>
                            <p>เว็บไซต์นี้จัดทำขึ้นโดยทีมงานนครลอตเตอรี่...</p>
                        </div>
                    </div>
                )}
            </nav>

            <Date />
            <_Random />
            <Statics />
            <_Order />
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
                            <li><a onClick={toggleImage3}>คู่มือท่องเว็บ</a></li>
                            <li>|</li>
                            <li><a onClick={toggleImage2}>เกี่ยวกับเรา</a></li>
                            <li>|</li>
                            <li><a onClick={handleMemberInfoClick}>ข้อมูลสมาชิก</a></li>
                            <li>|</li>
                            <li><p>ติดต่อเรา Contact Us :</p></li>
                        </ul>
                        <ul className={styles.contact_social}>
                            <li><a href="https://www.facebook.com/nudtavud.senapun/" target="_blank" className={styles.facebook}><FaFacebook /></a></li>
                            <li>
                                <div className={styles.line} onClick={toggleImage}>
                                    <FaLine onClick={() => window.open("https://line.me/ti/p/xyz", "_blank")} />
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
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

export default Page_Admin;