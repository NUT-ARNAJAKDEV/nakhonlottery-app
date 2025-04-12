import React, { useState, useEffect } from 'react'
import styles from './Statics.module.css'
import CountUp from 'react-countup'
import { db } from '../../firebaseConfig'
import { collection, onSnapshot } from 'firebase/firestore'

function Statics() {
  const [counts, setCounts] = useState({
    orders: 0,
    requests: 0,
    request_address: 0,
    auth: 0
  });

  // ฟังก์ชันจัดรูปแบบตัวเลข
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 100000) {
      return (num / 1000).toFixed(0) + 'K';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  useEffect(() => {
    const ordersUnsub = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setCounts(prev => ({ ...prev, orders: snapshot.size }));
    });

    const requestsUnsub = onSnapshot(collection(db, 'requests'), (snapshot) => {
      setCounts(prev => ({ ...prev, requests: snapshot.size }));
    });

    const requestAddressUnsub = onSnapshot(collection(db, 'request_address'), (snapshot) => {
      setCounts(prev => ({ ...prev, request_address: snapshot.size }));
    });

    const authUnsub = onSnapshot(collection(db, 'auth'), (snapshot) => {
      const uniqueEmails = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.email) {
          uniqueEmails.add(data.email);
        }
      });
      setCounts(prev => ({ ...prev, auth: uniqueEmails.size }));
    });

    // Cleanup function เพื่อยกเลิกการติดตามเมื่อ component ถูก unmount
    return () => {
      ordersUnsub();
      requestsUnsub();
      requestAddressUnsub();
      authUnsub();
    };
  }, []);

  return (
    <div className={styles.statics_con}>
      <div className={styles.statics_content}>
        {[
          { end: counts.orders, text: 'สินค้าทั้งหมด', collection: 'orders' },
          { end: counts.requests, text: 'คำสั่งซื้อ', collection: 'requests' },
          { end: counts.request_address, text: 'คำสั่งซื้อแบบจัดส่ง', collection: 'request_address' },
          { end: counts.auth, text: 'สมาชิกปัจจุบัน', collection: 'auth' }
        ].map(({ end, text, collection }, index) => (
          <div key={`${collection}-${index}`} className={styles.statics_items}>
            <h3>
              {end >= 100000 ? (
                // แสดงผลแบบ static สำหรับตัวเลขใหญ่
                formatNumber(end)
              ) : (
                // ใช้ CountUp สำหรับตัวเลขเล็ก
                <>
                  <CountUp key={`${collection}-${end}`} start={0} end={end} duration={2} />
                  {collection !== 'auth'}
                </>
              )}
            </h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Statics
