import React, { useState, useEffect } from 'react';
import styles from './Random.module.css';
import { Link } from "react-router-dom";
import { db } from '../../firebaseConfig'
import { collection, getDocs } from 'firebase/firestore';

function Random() {
  const [inputs, setInputs] = useState(['', '', '', '', '', '']);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // ฟังก์ชันกรองค่าให้ใส่เฉพาะตัวเลข 0-9 และอัปเดต state
  const handleInput = (index, event) => {
    const value = event.target.value.replace(/[^0-9]/g, '');
    const newInputs = [...inputs];
    newInputs[index] = value;
    setInputs(newInputs);
  };

  // ฟังก์ชันล้างค่า input ทั้งหมด
  const handleClear = () => {
    setInputs(['', '', '', '', '', '']);
  };

  // ฟังก์ชันสุ่มเลขจาก Firestore
  const handleRandom = async () => {
    // ตรวจสอบว่ามี input ที่ไม่ว่างหรือไม่
    const hasValue = inputs.some(input => input !== '');

    if (hasValue) {
      setModalMessage('กรุณากดล้างค่าก่อนทำการสุ่ม');
      setShowModal(true);
      return;
    }

    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));

      if (querySnapshot.empty) {
        setModalMessage('ไม่มีสินค้าในระบบ');
        setShowModal(true);
        return;
      }

      // สุ่มเลือกเอกสารหนึ่งจาก orders
      const orders = querySnapshot.docs.map(doc => doc.data());
      const randomIndex = Math.floor(Math.random() * orders.length);
      const randomOrder = orders[randomIndex];

      // แยก id ออกเป็นตัวเลขแต่ละหลัก
      if (randomOrder.id && randomOrder.id.length === 6) {
        const newInputs = randomOrder.id.split('').slice(0, 6);
        setInputs(newInputs);
        setModalMessage('ขอให้คุณโชคดี ! เลือกสินค้าจากแผงได้เลย');
        setShowModal(true);
      } else {
        setModalMessage('รูปแบบ ID ไม่ถูกต้อง');
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error fetching orders: ', error);
      setModalMessage('เกิดข้อผิดพลาดในการดึงข้อมูล');
      setShowModal(true);
    }
  };

  function CountdownTimer() {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    function calculateTimeLeft() {
      const now = new Date();
      const targetDate1 = new Date(now.getFullYear(), now.getMonth(), 1, 14, 30, 0);
      const targetDate1End = new Date(now.getFullYear(), now.getMonth(), 1, 16, 0, 0);
      const targetDate16 = new Date(now.getFullYear(), now.getMonth(), 16, 14, 30, 0);
      const targetDate16End = new Date(now.getFullYear(), now.getMonth(), 16, 16, 0, 0);

      if (now >= targetDate1 && now <= targetDate1End) {
        return { days: "00", hours: "00", minutes: "00", seconds: "00" };
      }

      if (now >= targetDate16 && now <= targetDate16End) {
        return { days: "00", hours: "00", minutes: "00", seconds: "00" };
      }

      let targetDate;
      if (now <= targetDate1) {
        targetDate = targetDate1.getTime();
      } else {
        targetDate = targetDate16.getTime();
      }

      const difference = targetDate - now.getTime();

      if (difference < 0) {
        const nextMonth = now.getMonth() + 1;
        const nextYear = now.getFullYear();
        targetDate = new Date(nextYear, nextMonth, 1, 14, 30, 0).getTime();
        const difference2 = targetDate - now.getTime();
        if (difference2 < 0) {
          return { days: "00", hours: "00", minutes: "00", seconds: "00" };
        }
        return {
          days: String(Math.floor(difference2 / (1000 * 60 * 60 * 24))).padStart(2, "0"),
          hours: String(Math.floor((difference2 % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, "0"),
          minutes: String(Math.floor((difference2 % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0"),
          seconds: String(Math.floor((difference2 % (1000 * 60)) / 1000)).padStart(2, "0"),
        };
      }

      return {
        days: String(Math.floor(difference / (1000 * 60 * 60 * 24))).padStart(2, "0"),
        hours: String(Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, "0"),
        minutes: String(Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0"),
        seconds: String(Math.floor((difference % (1000 * 60)) / 1000)).padStart(2, "0"),
      };
    }

    useEffect(() => {
      const timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 1000);

      return () => clearInterval(timer);
    }, []);

    return (
      <div className={styles.random_count}>
        <h3>เศรษฐีใหม่กำลังถือกำเนิด !</h3>
        <div className={styles.countdownTime}>
          <div className={styles.timeBlock}>
            <h2>{timeLeft.days}</h2>
            <h3>วัน</h3>
          </div>
          <div className={styles.timeBlock}>
            <h2>{timeLeft.hours}</h2>
            <h3>ชั่วโมง</h3>
          </div>
          <div className={styles.timeBlock}>
            <h2>{timeLeft.minutes}</h2>
            <h3>นาที</h3>
          </div>
          <div className={styles.timeBlock}>
            <h2>{timeLeft.seconds}</h2>
            <h3>วินาที</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.random_wrapper}>
      <div className={styles.random_container}>
        <CountdownTimer />
        <div className={styles.random_random}>
          <h3>เสี่ยงดวงกันเลย !</h3>
          <div className={styles.random_input}>
            {inputs.map((value, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={value}
                onChange={(e) => handleInput(index, e)}
                disabled
              />
            ))}
          </div>
          <div className={styles.random_button}>
            <ul>
              <a href='#' onClick={(e) => { e.preventDefault(); handleRandom(); }}><li>สุ่ม</li></a>
              <a href='#' onClick={(e) => { e.preventDefault(); handleClear(); }}><li>ล้างค่า</li></a>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal สำหรับแสดงข้อความ */}
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modal_content}>
            <p className={
              modalMessage.includes('โชคดี') ? styles.success_message :
                modalMessage.includes('ไม่มีสินค้า') || modalMessage.includes('ไม่ถูกต้อง') ? styles.error_message :
                  styles.warning_message
            }>
              {modalMessage}
            </p>
            <button onClick={() => setShowModal(false)}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Random;