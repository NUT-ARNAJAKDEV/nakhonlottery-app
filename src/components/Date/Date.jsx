import React, { useEffect, useRef, useState } from 'react';
import styles from './Date.module.css';
import 'animate.css';

function DateComponent() {
  const h3Ref = useRef(null);
  const [dateText, setDateText] = useState('');

  // ฟังก์ชันแปลงเดือนเป็นภาษาไทย
  const getThaiMonthName = (month) => {
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
      'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
      'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return months[month];
  };

  // ฟังก์ชันคำนวณวันที่งวด
  const calculateLotteryDate = () => {
    const now = new Date();
    const currentDate = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear() + 543; // แปลงเป็น พ.ศ.

    let drawDate, drawMonth, drawYear;

    if (currentDate === 1) {
      // วันที่ 1 ของเดือน
      drawDate = 1;
      drawMonth = currentMonth;
      drawYear = currentYear;
    } else if (currentDate >= 2 && currentDate <= 16) {
      // วันที่ 2-16 ของเดือน
      drawDate = 16;
      drawMonth = currentMonth;
      drawYear = currentYear;
    } else {
      // วันที่ 17 ถึงวันสุดท้ายของเดือน
      drawDate = 1;
      
      // ตรวจสอบว่าเป็นเดือนธันวาคมหรือไม่
      if (currentMonth === 11) {
        drawMonth = 0; // มกราคม
        drawYear = currentYear + 1; // ปีถัดไป
      } else {
        drawMonth = currentMonth + 1;
        drawYear = currentYear;
      }
    }

    const thaiMonthName = getThaiMonthName(drawMonth);
    return `งวดวันที่ ${drawDate} ${thaiMonthName} ${drawYear}`;
  };

  useEffect(() => {
    // ตั้งค่าข้อความเริ่มต้น
    setDateText(calculateLotteryDate());

    const interval = setInterval(() => {
      if (h3Ref.current) {
        h3Ref.current.classList.add('animate__animated', 'animate__pulse');

        setTimeout(() => {
          h3Ref.current.classList.remove('animate__animated', 'animate__pulse');
          // รีเซ็ต animation โดยการ force reflow
          h3Ref.current.style.display = "none";
          void h3Ref.current.offsetWidth; // Trigger reflow
          h3Ref.current.style.display = "block";
        }, 1000);
      }
    }, 2000); // ทำงานทุก 2 วินาที

    return () => clearInterval(interval); // ล้าง interval เมื่อ component ถูก unmount
  }, []);

  return (
    <div className={styles.date_wrapper}>
      <h3 ref={h3Ref}>{dateText}</h3>
    </div>
  );
}

export default DateComponent;